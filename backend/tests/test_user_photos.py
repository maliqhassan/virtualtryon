import io

from httpx import AsyncClient
from PIL import Image


def _jpeg_bytes(color: tuple[int, int, int] = (200, 60, 40)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def test_create_user_photo_success(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 201
    body = response.json()

    assert body["storage_key"].startswith("/uploads/")
    assert body["image_url"] == body["storage_key"]
    assert "id" in body
    assert "created_at" in body


async def test_create_user_photo_rejects_bad_content_type(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("note.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 422


async def test_create_user_photo_rejects_oversized_upload(client: AsyncClient) -> None:
    oversized = b"\xff\xd8" + b"0" * (10 * 1024 * 1024 + 1)  # over the 10MB cap
    response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("big.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 422


async def test_create_user_photo_issues_device_id(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 201
    assert "x-device-id" in response.headers
