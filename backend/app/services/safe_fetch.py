"""Fetches a web address a user gave us (a store's product page, then its
photo) without letting that address reach anything but the public internet.

The server is the one making the request, so an unchecked link could point
it at Render's internal network, the database or a cloud metadata service
(SSRF). Every hop is checked before connecting:

- http/https only, default ports or 80/443 only, no user:password@ in the link
- the host name is resolved here and every address it resolves to must be
  public; the connection then goes to that checked address (with the real
  host name kept for the Host header and the HTTPS certificate check), so a
  DNS answer can't change between the check and the connection
- redirects are followed by hand, at most MAX_REDIRECTS, each one re-checked
- a time limit per read and for the whole fetch (so a server that sends a
  byte every few seconds can't hold a request open), a size cap on every
  response; no proxy settings from the environment, no cookies carried
  between requests

Injected into link_import.py as a `PageFetcher` (same pattern as the photo
checks), so tests swap in a fake and never touch the network.
"""

import asyncio
import ipaddress
import socket
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

# Honest about what we are, like the link-preview bots of chat apps; stores
# generally serve those their product tags because they want link previews.
USER_AGENT = "Mozilla/5.0 (compatible; VirtualTryOnLinkPreview/1.0)"
MAX_REDIRECTS = 3
TIMEOUT = httpx.Timeout(10.0)
TOTAL_TIMEOUT_SECONDS = 20.0  # all hops of one fetch together
_DEFAULT_PORTS = {"http": 80, "https": 443}


class FetchError(Exception):
    """The address couldn't be fetched: network error, error status, too large."""


class BlockedUrlError(FetchError):
    """The address isn't allowed: wrong scheme or port, or not a public address."""


@dataclass(frozen=True)
class FetchedResource:
    url: str  # where the content actually came from, after redirects
    content_type: str  # media type only, lowercased, e.g. "text/html"
    content: bytes
    charset: str | None = None  # from the Content-Type header, if the site sent one


class PageFetcher(Protocol):
    async def fetch(
        self, url: str, *, max_bytes: int, accept: str, truncate: bool = False
    ) -> FetchedResource:
        """`truncate`: keep the first `max_bytes` of a bigger response instead
        of refusing it (fine for web pages, whose product tags come early)."""
        ...


Resolver = Callable[[str, int], Awaitable[list[str]]]


async def resolve_host(host: str, port: int) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    return list(dict.fromkeys(str(info[4][0]) for info in infos))


def is_public_address(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


@dataclass(frozen=True)
class _PinnedRequest:
    url: str  # same address with the host replaced by the checked IP
    host_header: str
    server_name: str  # for TLS: SNI and certificate check


class SafeFetcher:
    def __init__(
        self,
        resolver: Resolver = resolve_host,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._resolver = resolver
        self._transport = transport

    async def _pin(self, url: str) -> _PinnedRequest:
        try:
            parts = urlsplit(url)
            explicit_port = parts.port
        except ValueError as exc:
            raise BlockedUrlError("Not a valid web address") from exc
        if parts.scheme not in _DEFAULT_PORTS or not parts.hostname:
            raise BlockedUrlError("Only http and https links are supported")
        if parts.username is not None or parts.password is not None:
            raise BlockedUrlError("Links with a user name or password aren't supported")
        if explicit_port is not None and explicit_port not in _DEFAULT_PORTS.values():
            raise BlockedUrlError("Links to unusual ports aren't supported")
        try:
            host = parts.hostname.encode("idna").decode("ascii")
        except UnicodeError as exc:
            raise BlockedUrlError("Not a valid web address") from exc

        port = explicit_port or _DEFAULT_PORTS[parts.scheme]
        try:
            addresses = await self._resolver(host, port)
        except (OSError, UnicodeError) as exc:
            raise FetchError(f"Couldn't find {host}") from exc
        if not addresses or not all(is_public_address(a) for a in addresses):
            raise BlockedUrlError("That address isn't on the public internet")

        ip = addresses[0]
        netloc = f"[{ip}]" if ":" in ip else ip
        host_header = host
        if explicit_port is not None:
            netloc += f":{explicit_port}"
            host_header += f":{explicit_port}"
        return _PinnedRequest(
            url=urlunsplit((parts.scheme, netloc, parts.path or "/", parts.query, "")),
            host_header=host_header,
            server_name=host,
        )

    async def fetch(
        self, url: str, *, max_bytes: int, accept: str, truncate: bool = False
    ) -> FetchedResource:
        try:
            async with asyncio.timeout(TOTAL_TIMEOUT_SECONDS):
                return await self._fetch(url, max_bytes=max_bytes, accept=accept, truncate=truncate)
        except TimeoutError as exc:
            raise FetchError("The site took too long to answer") from exc

    async def _fetch(
        self, url: str, *, max_bytes: int, accept: str, truncate: bool
    ) -> FetchedResource:
        current = url
        async with httpx.AsyncClient(
            transport=self._transport, timeout=TIMEOUT, follow_redirects=False, trust_env=False
        ) as client:
            for _ in range(MAX_REDIRECTS + 1):
                pinned = await self._pin(current)
                client.cookies.clear()
                try:
                    async with client.stream(
                        "GET",
                        pinned.url,
                        headers={
                            "Host": pinned.host_header,
                            "User-Agent": USER_AGENT,
                            "Accept": accept,
                        },
                        extensions={"sni_hostname": pinned.server_name},
                    ) as response:
                        if response.is_redirect:  # a 3xx with a Location header
                            current = urljoin(current, response.headers["location"])
                            continue
                        if response.status_code != 200:
                            raise FetchError(f"The site answered {response.status_code}")
                        declared = response.headers.get("content-length", "")
                        if not truncate and declared.isdigit() and int(declared) > max_bytes:
                            raise FetchError("Response is too large")
                        chunks: list[bytes] = []
                        total = 0
                        async for chunk in response.aiter_bytes():
                            if total + len(chunk) > max_bytes:
                                if not truncate:
                                    raise FetchError("Response is too large")
                                chunks.append(chunk[: max_bytes - total])
                                break
                            total += len(chunk)
                            chunks.append(chunk)
                        media_type, _, params = response.headers.get("content-type", "").partition(
                            ";"
                        )
                        charset = None
                        for param in params.split(";"):
                            name, _, value = param.strip().partition("=")
                            if name.lower() == "charset" and value:
                                charset = value.strip().strip('"')
                        return FetchedResource(
                            url=current,
                            content_type=media_type.strip().lower(),
                            content=b"".join(chunks),
                            charset=charset,
                        )
                except httpx.HTTPError as exc:
                    raise FetchError(f"Couldn't reach the site: {type(exc).__name__}") from exc
        raise FetchError("Too many redirects")


def get_page_fetcher() -> PageFetcher:
    return SafeFetcher()
