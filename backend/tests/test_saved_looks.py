import io
import uuid

from httpx import AsyncClient
from PIL import Image


def _jpeg_bytes(color: tuple[int, int, int] = (255, 0, 0)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


def _files() -> dict[str, tuple[str, bytes, str]]:
    return {
        "user_image": ("user.jpg", _jpeg_bytes((255, 0, 0)), "image/jpeg"),
        "clothing_image": ("garment.jpg", _jpeg_bytes((0, 255, 0)), "image/jpeg"),
        "generated_image": ("result.jpg", _jpeg_bytes((0, 0, 255)), "image/jpeg"),
    }


async def _create_look(client: AsyncClient, title: str = "Test Look") -> tuple[dict, str]:
    """Simulates a brand-new client: sends no device id, and returns the
    server-issued one from the response header alongside the created look
    — a client can never choose its own device id (see
    app/services/guest_identity.py), so tests must behave the same way.
    """
    response = await client.post(
        "/api/v1/saved-looks",
        files=_files(),
        data={"title": title},
    )
    assert response.status_code == 201
    device_id = response.headers["x-device-id"]
    return response.json(), device_id


async def test_create_saved_look_success(client: AsyncClient) -> None:
    look, device_id = await _create_look(client, title="My First Look")

    assert look["title"] == "My First Look"
    assert look["is_favourite"] is False
    assert look["user_image_url"].startswith("/uploads/")
    assert look["clothing_image_url"].startswith("/uploads/")
    assert look["generated_image_url"].startswith("/uploads/")

    await client.delete(f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": device_id})


async def test_create_saved_look_rejects_bad_content_type(client: AsyncClient) -> None:
    files = _files()
    files["user_image"] = ("note.txt", b"not an image", "text/plain")

    response = await client.post(
        "/api/v1/saved-looks",
        files=files,
        data={"title": "Bad Upload"},
    )
    assert response.status_code == 422


async def test_list_is_scoped_to_device_id(client: AsyncClient) -> None:
    look, device_a = await _create_look(client)

    response_a = await client.get("/api/v1/saved-looks", headers={"X-Device-Id": device_a})
    # A second, genuinely different client: no device id presented at all.
    response_b = await client.get("/api/v1/saved-looks")

    assert any(item["id"] == look["id"] for item in response_a.json())
    assert not any(item["id"] == look["id"] for item in response_b.json())

    await client.delete(f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": device_a})


async def test_patch_updates_title_and_favourite(client: AsyncClient) -> None:
    look, device_id = await _create_look(client)

    response = await client.patch(
        f"/api/v1/saved-looks/{look['id']}",
        json={"title": "Renamed", "is_favourite": True},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Renamed"
    assert updated["is_favourite"] is True

    await client.delete(f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": device_id})


async def test_patch_from_wrong_device_returns_404(client: AsyncClient) -> None:
    look, owner_device = await _create_look(client)
    attacker_device = f"attacker-{uuid.uuid4()}"  # never recognized -> a fresh, unrelated guest

    response = await client.patch(
        f"/api/v1/saved-looks/{look['id']}",
        json={"title": "Hijacked"},
        headers={"X-Device-Id": attacker_device},
    )
    assert response.status_code == 404

    await client.delete(f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": owner_device})


async def test_delete_from_wrong_device_returns_404_and_does_not_delete(
    client: AsyncClient,
) -> None:
    look, owner_device = await _create_look(client)
    attacker_device = f"attacker-{uuid.uuid4()}"

    attacker_response = await client.delete(
        f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": attacker_device}
    )
    assert attacker_response.status_code == 404

    still_there = await client.get("/api/v1/saved-looks", headers={"X-Device-Id": owner_device})
    assert any(item["id"] == look["id"] for item in still_there.json())

    owner_response = await client.delete(
        f"/api/v1/saved-looks/{look['id']}", headers={"X-Device-Id": owner_device}
    )
    assert owner_response.status_code == 204
