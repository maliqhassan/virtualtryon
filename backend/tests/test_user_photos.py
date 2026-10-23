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


async def test_current_photo_is_null_before_upload(client: AsyncClient) -> None:
    response = await client.get("/api/v1/user-photos/current")
    assert response.status_code == 200
    assert response.json() is None


async def test_current_photo_is_the_latest_upload(client: AsyncClient) -> None:
    first = await client.post(
        "/api/v1/user-photos", files={"image": ("a.jpg", _jpeg_bytes(), "image/jpeg")}
    )
    device_id = first.headers["x-device-id"]
    second = await client.post(
        "/api/v1/user-photos",
        files={"image": ("b.jpg", _jpeg_bytes((1, 2, 3)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )

    current = await client.get("/api/v1/user-photos/current", headers={"X-Device-Id": device_id})

    assert current.json()["id"] == second.json()["id"]


async def test_delete_removes_every_photo_and_file(client: AsyncClient) -> None:
    from app.services.storage import get_storage_service

    created = await client.post(
        "/api/v1/user-photos", files={"image": ("a.jpg", _jpeg_bytes(), "image/jpeg")}
    )
    device_id = created.headers["x-device-id"]
    storage_key = created.json()["storage_key"]

    deleted = await client.delete("/api/v1/user-photos/current", headers={"X-Device-Id": device_id})
    current = await client.get("/api/v1/user-photos/current", headers={"X-Device-Id": device_id})

    assert deleted.status_code == 204
    assert current.json() is None
    try:
        get_storage_service().read(storage_key)
        raise AssertionError("photo file should have been deleted")
    except FileNotFoundError:
        pass


async def test_photo_rejected_by_full_body_check_returns_422(
    client: AsyncClient,
) -> None:
    from app.main import app
    from app.services.photo_quality import (
        NOT_FULL_BODY_MESSAGE,
        PhotoRejectedError,
        get_full_body_checker,
    )

    class RejectingChecker:
        def check(self, image_bytes: bytes) -> None:
            raise PhotoRejectedError(NOT_FULL_BODY_MESSAGE)

    app.dependency_overrides[get_full_body_checker] = RejectingChecker
    try:
        response = await client.post(
            "/api/v1/user-photos",
            files={"image": ("a.jpg", _jpeg_bytes(), "image/jpeg")},
        )
    finally:
        app.dependency_overrides.pop(get_full_body_checker, None)

    assert response.status_code == 422
    assert response.json()["detail"] == NOT_FULL_BODY_MESSAGE


async def test_replacing_photo_deletes_the_old_one(client: AsyncClient) -> None:
    from app.services.storage import get_storage_service

    first = await client.post(
        "/api/v1/user-photos", files={"image": ("a.jpg", _jpeg_bytes(), "image/jpeg")}
    )
    device_id = first.headers["x-device-id"]
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("b.jpg", _jpeg_bytes((4, 5, 6)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )

    try:
        get_storage_service().read(first.json()["storage_key"])
        raise AssertionError("the replaced photo's file should have been deleted")
    except FileNotFoundError:
        pass


async def test_side_and_back_views_are_kept_separately(client: AsyncClient) -> None:
    front = await client.post(
        "/api/v1/user-photos", files={"image": ("f.jpg", _jpeg_bytes(), "image/jpeg")}
    )
    headers = {"X-Device-Id": front.headers["x-device-id"]}
    side = await client.post(
        "/api/v1/user-photos",
        files={"image": ("s.jpg", _jpeg_bytes((9, 9, 9)), "image/jpeg")},
        data={"angle": "side"},
        headers=headers,
    )
    bad = await client.post(
        "/api/v1/user-photos",
        files={"image": ("x.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"angle": "top"},
        headers=headers,
    )

    views = (await client.get("/api/v1/user-photos", headers=headers)).json()
    current = (await client.get("/api/v1/user-photos/current", headers=headers)).json()

    assert side.json()["angle"] == "side"
    assert bad.status_code == 422
    assert [v["angle"] for v in views] == ["front", "side"]
    assert current["id"] == front.json()["id"]  # try-ons still use the front photo


async def test_cutout_is_stored_when_background_removal_works(client: AsyncClient) -> None:
    from app.main import app
    from app.services.photo_background import get_background_remover
    from app.services.storage import get_storage_service

    class FakeRemover:
        def remove(self, image_bytes: bytes) -> bytes | None:
            return _jpeg_bytes((1, 1, 1))

    app.dependency_overrides[get_background_remover] = FakeRemover
    try:
        response = await client.post(
            "/api/v1/user-photos", files={"image": ("a.jpg", _jpeg_bytes(), "image/jpeg")}
        )
    finally:
        app.dependency_overrides.pop(get_background_remover, None)

    cutout = response.json()["cutout_url"]
    assert cutout and cutout != response.json()["image_url"]
    assert get_storage_service().read(cutout)


def test_composite_crops_to_the_person() -> None:
    import numpy as np
    from PIL import Image

    from app.services.photo_background import BACKGROUND, composite_on_plain_background

    image = Image.new("RGB", (100, 200), (10, 120, 10))
    mask = np.zeros((200, 100), dtype=bool)
    mask[50:150, 30:70] = True

    result = composite_on_plain_background(image, mask)

    assert result.width < 100 and result.height < 200  # cropped around the person
    assert result.getpixel((0, 0)) == BACKGROUND  # background replaced
