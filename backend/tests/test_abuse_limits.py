"""Limits that keep one caller from exhausting the server: request size,
new guests per address, uploads per user, and the disk reserve."""

import io
from collections import namedtuple

import pytest
from httpx import AsyncClient
from PIL import Image

from app.services import guest_identity, upload_limits
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.storage import StorageFullError, local_storage, save_together

MB = 1024 * 1024


def _jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(30, 120, 60)).save(buf, format="JPEG")
    return buf.getvalue()


async def _new_guest(client: AsyncClient) -> str:
    response = await client.get("/api/v1/garments")
    assert response.status_code == 200
    return response.headers["x-device-id"]


async def _upload_garment(client: AsyncClient, device_id: str) -> int:
    response = await client.post(
        "/api/v1/garments",
        headers={"X-Device-Id": device_id},
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Tee", "category": "tops"},
    )
    return response.status_code


# Request size


async def test_declared_oversized_body_is_refused_before_reading(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/garments",
        content=b"x" * 10,
        headers={
            "Content-Length": str(40 * MB),
            "Content-Type": "multipart/form-data; b=x",
        },
    )
    assert response.status_code == 413
    assert "under 10 MB" in response.json()["detail"]


async def test_streamed_oversized_body_without_length_is_refused(
    client: AsyncClient,
) -> None:
    async def chunks():
        # A valid multipart file part that never ends, sent with no length.
        yield (
            b'--x\r\nContent-Disposition: form-data; name="image"; filename="a.jpg"\r\n'
            b"Content-Type: image/jpeg\r\n\r\n"
        )
        for _ in range(40):
            yield b"x" * MB

    response = await client.post(
        "/api/v1/garments",
        content=chunks(),
        headers={"Content-Type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 413


async def test_image_over_ten_mb_but_under_request_limit_is_rejected(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("big.jpg", b"\xff" * (10 * MB + 100), "image/jpeg")},
        data={"title": "Big", "category": "tops"},
    )
    assert response.status_code == 422
    assert "limit" in response.json()["detail"]


# New guests per address


async def test_new_guests_are_limited_per_address(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(guest_identity, "_per_address", SlidingWindowLimiter(3, 3600))
    device_ids = [await _new_guest(client) for _ in range(3)]

    refused = await client.get("/api/v1/garments")
    assert refused.status_code == 429
    assert refused.json()["detail"]["code"] == "too_many_new_guests"
    assert "x-device-id" not in refused.headers

    # Guests that already exist keep working.
    known = await client.get("/api/v1/garments", headers={"X-Device-Id": device_ids[0]})
    assert known.status_code == 200


async def test_overall_new_guest_cap_applies_across_addresses(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(guest_identity, "_all_addresses", SlidingWindowLimiter(2, 3600))
    await _new_guest(client)
    await _new_guest(client)
    assert (await client.get("/api/v1/garments")).status_code == 429


# Uploads per user


async def test_daily_uploads_are_limited_per_user(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(upload_limits, "_per_user", SlidingWindowLimiter(2, 24 * 3600))
    device_id = await _new_guest(client)
    assert await _upload_garment(client, device_id) == 201
    assert await _upload_garment(client, device_id) == 201

    refused = await client.post(
        "/api/v1/garments",
        headers={"X-Device-Id": device_id},
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Tee", "category": "tops"},
    )
    assert refused.status_code == 429
    assert "tomorrow" in refused.json()["detail"]
    assert (
        len((await client.get("/api/v1/garments", headers={"X-Device-Id": device_id})).json()) == 2
    )

    # Another user has their own allowance.
    assert await _upload_garment(client, await _new_guest(client)) == 201


async def test_invalid_uploads_do_not_use_the_allowance(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(upload_limits, "_per_user", SlidingWindowLimiter(1, 24 * 3600))
    device_id = await _new_guest(client)
    bad = await client.post(
        "/api/v1/garments",
        headers={"X-Device-Id": device_id},
        files={"image": ("note.txt", b"not an image", "text/plain")},
        data={"title": "Bad", "category": "tops"},
    )
    assert bad.status_code == 422
    assert await _upload_garment(client, device_id) == 201


# Disk reserve

_Usage = namedtuple("_Usage", "total used free")


async def test_upload_is_refused_when_disk_is_nearly_full(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        local_storage.shutil,
        "disk_usage",
        lambda _: _Usage(1024 * MB, 900 * MB, 100 * MB),
    )
    device_id = await _new_guest(client)
    response = await client.post(
        "/api/v1/garments",
        headers={"X-Device-Id": device_id},
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Tee", "category": "tops"},
    )
    assert response.status_code == 507
    assert "can't store" in response.json()["detail"]
    # Nothing half-made: no garment row without its file.
    assert (await client.get("/api/v1/garments", headers={"X-Device-Id": device_id})).json() == []


def test_storage_saves_while_above_the_reserve(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        local_storage.shutil,
        "disk_usage",
        lambda _: _Usage(1024 * MB, 800 * MB, 224 * MB),
    )
    storage = local_storage.LocalStorageProvider(tmp_path)
    path = storage.save(b"abc", "jpg")
    assert storage.read(path) == b"abc"


# The caller's address


async def test_forwarded_for_cannot_dodge_the_guest_limit(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(guest_identity, "_per_address", SlidingWindowLimiter(2, 3600))
    for n in range(2):
        ok = await client.get("/api/v1/garments", headers={"X-Forwarded-For": f"10.0.0.{n}"})
        assert ok.status_code == 200
    refused = await client.get("/api/v1/garments", headers={"X-Forwarded-For": "10.0.0.9"})
    assert refused.status_code == 429


async def test_the_proxy_set_address_header_is_used(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(guest_identity, "_per_address", SlidingWindowLimiter(1, 3600))
    first = await client.get("/api/v1/garments", headers={"CF-Connecting-IP": "203.0.113.1"})
    other = await client.get("/api/v1/garments", headers={"CF-Connecting-IP": "203.0.113.2"})
    again = await client.get("/api/v1/garments", headers={"CF-Connecting-IP": "203.0.113.1"})
    assert (first.status_code, other.status_code, again.status_code) == (200, 200, 429)


async def test_a_full_overall_cap_does_not_charge_the_address(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    per_address = SlidingWindowLimiter(5, 3600)
    monkeypatch.setattr(guest_identity, "_per_address", per_address)
    monkeypatch.setattr(guest_identity, "_all_addresses", SlidingWindowLimiter(0, 3600))
    for _ in range(3):
        assert (await client.get("/api/v1/garments")).status_code == 429
    assert not per_address.is_exhausted("127.0.0.1")
    assert per_address.try_acquire("127.0.0.1")


async def test_a_saved_look_counts_as_three_photos(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(upload_limits, "_per_user", SlidingWindowLimiter(4, 24 * 3600))
    device_id = await _new_guest(client)
    image = ("a.jpg", _jpeg_bytes(), "image/jpeg")
    files = {"user_image": image, "clothing_image": image, "generated_image": image}
    first = await client.post(
        "/api/v1/saved-looks", headers={"X-Device-Id": device_id}, files=files
    )
    assert first.status_code == 201
    second = await client.post(
        "/api/v1/saved-looks", headers={"X-Device-Id": device_id}, files=files
    )
    assert second.status_code == 429


# Files saved together


class _FillsUpAfter(local_storage.LocalStorageProvider):
    def __init__(self, base_dir, room: int) -> None:
        super().__init__(base_dir)
        self.room = room

    def save(self, content: bytes, extension: str) -> str:
        if self.room == 0:
            raise StorageFullError("full")
        self.room -= 1
        return super().save(content, extension)


def test_save_together_removes_earlier_files_when_one_fails(tmp_path) -> None:
    storage = _FillsUpAfter(tmp_path, room=2)
    with pytest.raises(StorageFullError):
        save_together(storage, [(b"a", "jpg"), (b"b", "jpg"), (b"c", "jpg")])
    assert list(tmp_path.iterdir()) == []


def test_save_together_returns_paths_in_order(tmp_path) -> None:
    storage = local_storage.LocalStorageProvider(tmp_path)
    paths = save_together(storage, [(b"a", "jpg"), (b"b", "png")])
    assert [storage.read(path) for path in paths] == [b"a", b"b"]
    assert paths[1].endswith(".png")
