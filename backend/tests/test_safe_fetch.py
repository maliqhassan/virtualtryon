import asyncio

import httpx
import pytest

from app.services import safe_fetch
from app.services.safe_fetch import BlockedUrlError, FetchError, SafeFetcher, is_public_address

PUBLIC_IP = "93.184.216.34"


def _resolver(table: dict[str, list[str]]):
    async def resolve(host: str, port: int) -> list[str]:
        if host not in table:
            raise OSError("no such host")
        return table[host]

    return resolve


def _fetcher(table: dict[str, list[str]], handler) -> SafeFetcher:
    return SafeFetcher(resolver=_resolver(table), transport=httpx.MockTransport(handler))


def _never_called(request: httpx.Request) -> httpx.Response:
    raise AssertionError(f"Should not have connected to {request.url}")


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "10.1.2.3", "172.16.0.9", "192.168.1.4", "169.254.169.254", "100.64.0.1", "::1"]
    + ["fe80::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0", "224.0.0.1"],
)
def test_internal_addresses_are_not_public(address: str) -> None:
    assert not is_public_address(address)


def test_public_address_is_allowed() -> None:
    assert is_public_address(PUBLIC_IP)


@pytest.mark.parametrize(
    "url",
    [
        "ftp://shop.example.com/file",
        "file:///etc/passwd",
        "https://shop.example.com:8080/item",
        "https://user:secret@shop.example.com/item",
        "https://internal.example.com/item",  # resolves to a private address
        "https://mixed.example.com/item",  # one public and one private answer
        "http://169.254.169.254/latest/meta-data",
    ],
)
async def test_blocked_links_never_connect(url: str) -> None:
    fetcher = _fetcher(
        {
            "shop.example.com": [PUBLIC_IP],
            "internal.example.com": ["10.0.0.5"],
            "mixed.example.com": [PUBLIC_IP, "192.168.0.10"],
            "169.254.169.254": ["169.254.169.254"],
        },
        _never_called,
    )
    with pytest.raises(BlockedUrlError):
        await fetcher.fetch(url, max_bytes=1000, accept="*/*")


async def test_connects_to_the_checked_address_with_the_real_host_name() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, headers={"content-type": "text/html; charset=utf-8"}, text="ok")

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    result = await fetcher.fetch(
        "https://shop.example.com/p/1?x=2", max_bytes=1000, accept="text/html"
    )

    assert result.content == b"ok"
    assert result.content_type == "text/html"
    assert result.url == "https://shop.example.com/p/1?x=2"
    assert seen[0].url.host == PUBLIC_IP
    assert seen[0].url.path == "/p/1"
    assert seen[0].headers["host"] == "shop.example.com"
    assert seen[0].extensions["sni_hostname"] == "shop.example.com"


async def test_redirects_are_followed_and_rechecked() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.headers["host"] == "short.example.com":
            return httpx.Response(301, headers={"location": "https://shop.example.com/item"})
        return httpx.Response(200, headers={"content-type": "text/html"}, text="page")

    fetcher = _fetcher(
        {"short.example.com": [PUBLIC_IP], "shop.example.com": ["93.184.216.35"]}, handler
    )
    result = await fetcher.fetch("https://short.example.com/x", max_bytes=1000, accept="*/*")
    assert result.url == "https://shop.example.com/item"
    assert result.content == b"page"


async def test_redirect_to_an_internal_address_is_blocked() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"location": "http://internal.example.com/admin"})

    fetcher = _fetcher(
        {"shop.example.com": [PUBLIC_IP], "internal.example.com": ["10.0.0.5"]}, handler
    )
    with pytest.raises(BlockedUrlError):
        await fetcher.fetch("https://shop.example.com/item", max_bytes=1000, accept="*/*")


async def test_too_many_redirects() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"location": "/again"})

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    with pytest.raises(FetchError, match="redirects"):
        await fetcher.fetch("https://shop.example.com/item", max_bytes=1000, accept="*/*")


async def test_responses_over_the_size_limit_are_refused() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"x" * 5000)

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    with pytest.raises(FetchError, match="too large"):
        await fetcher.fetch("https://shop.example.com/big", max_bytes=1000, accept="*/*")


async def test_pages_can_be_cut_off_instead_of_refused() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"x" * 5000)

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    result = await fetcher.fetch(
        "https://shop.example.com/big", max_bytes=1000, accept="*/*", truncate=True
    )
    assert result.content == b"x" * 1000


async def test_charset_is_reported() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": 'text/html; charset="windows-1252"'}, content=b"x"
        )

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    result = await fetcher.fetch("https://shop.example.com/", max_bytes=10, accept="*/*")
    assert (result.content_type, result.charset) == ("text/html", "windows-1252")


async def test_whole_fetch_has_a_time_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(safe_fetch, "TOTAL_TIMEOUT_SECONDS", 0.05)

    async def slow_handler(request: httpx.Request) -> httpx.Response:
        await asyncio.sleep(1)
        return httpx.Response(200)

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, slow_handler)
    with pytest.raises(FetchError, match="too long"):
        await fetcher.fetch("https://shop.example.com/", max_bytes=10, accept="*/*")


async def test_error_status_and_unknown_host_are_fetch_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403)

    fetcher = _fetcher({"shop.example.com": [PUBLIC_IP]}, handler)
    with pytest.raises(FetchError, match="403"):
        await fetcher.fetch("https://shop.example.com/item", max_bytes=1000, accept="*/*")
    with pytest.raises(FetchError, match="Couldn't find"):
        await fetcher.fetch("https://nowhere.example.com/", max_bytes=1000, accept="*/*")
