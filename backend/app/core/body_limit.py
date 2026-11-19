"""Refuses request bodies over a size limit before they're read.

Without this, an upload is parsed in full (into memory and temporary files)
before any endpoint can check its size, so one huge request could exhaust
the server's memory or disk. The limit is checked twice: against the
declared Content-Length, and against the bytes actually received, so a
client can't get around it by sending a false header or none (chunked).

A plain ASGI middleware rather than a FastAPI dependency: it has to wrap the
body stream itself, which runs before any dependency.
"""

import json

from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class _BodyTooLarge(HTTPException):
    """An HTTPException so FastAPI's body parsing passes it through as a 413
    (it turns any other exception raised while reading into a 400)."""

    def __init__(self, message: str) -> None:
        super().__init__(status_code=413, detail=message)


class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int, message: str) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.message = message

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = _content_length(scope)
        if declared is not None and declared > self.max_bytes:
            await _send_too_large(send, self.message)
            return

        received = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge(self.message)
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _BodyTooLarge:
            if response_started:
                raise
            await _send_too_large(send, self.message)


def _content_length(scope: Scope) -> int | None:
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _send_too_large(send: Send, message: str) -> None:
    body = json.dumps({"detail": message}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"connection", b"close"),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
