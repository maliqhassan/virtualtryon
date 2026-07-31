import io

from httpx import AsyncClient
from PIL import Image


def _jpeg_bytes(color: tuple[int, int, int] = (30, 120, 60)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def _create_garment(
    client: AsyncClient, title: str = "Test Garment", category: str = "tops"
) -> tuple[dict, str]:
    """Simulates a brand-new client: sends no device id, returns the
    server-issued one from the response header alongside the created
    garment — mirrors test_saved_looks.py's helper for the same reason
    (a client can never choose its own device id).
    """
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": title, "category": category, "color": "blue", "season": "fall"},
    )
    assert response.status_code == 201
    device_id = response.headers["x-device-id"]
    return response.json(), device_id


async def test_create_garment_success(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client, title="Blue Jacket", category="outerwear")

    assert garment["title"] == "Blue Jacket"
    assert garment["category"] == "outerwear"
    assert garment["color"] == "blue"
    assert garment["season"] == "fall"
    assert garment["image_url"].startswith("/uploads/")

    await client.delete(f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": device_id})


async def test_create_garment_rejects_bad_content_type(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("note.txt", b"not an image", "text/plain")},
        data={"title": "Bad Upload", "category": "misc"},
    )
    assert response.status_code == 422


async def test_list_is_scoped_to_device_id(client: AsyncClient) -> None:
    garment, device_a = await _create_garment(client)

    response_a = await client.get("/api/v1/garments", headers={"X-Device-Id": device_a})
    response_b = await client.get("/api/v1/garments")  # a genuinely different, new guest

    assert any(item["id"] == garment["id"] for item in response_a.json())
    assert not any(item["id"] == garment["id"] for item in response_b.json())

    await client.delete(f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": device_a})


async def test_patch_updates_title_and_category(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)

    response = await client.patch(
        f"/api/v1/garments/{garment['id']}",
        json={"title": "Renamed", "category": "jackets"},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Renamed"
    assert updated["category"] == "jackets"
    assert updated["updated_at"] != garment["updated_at"]

    await client.delete(f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": device_id})


async def test_patch_from_wrong_device_returns_404(client: AsyncClient) -> None:
    garment, owner_device = await _create_garment(client)

    response = await client.patch(
        f"/api/v1/garments/{garment['id']}",
        json={"title": "Hijacked"},
        headers={"X-Device-Id": "attacker-device"},
    )
    assert response.status_code == 404

    await client.delete(f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": owner_device})


async def test_delete_from_wrong_device_returns_404_and_does_not_delete(
    client: AsyncClient,
) -> None:
    garment, owner_device = await _create_garment(client)

    attacker_response = await client.delete(
        f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": "attacker-device"}
    )
    assert attacker_response.status_code == 404

    still_there = await client.get("/api/v1/garments", headers={"X-Device-Id": owner_device})
    assert any(item["id"] == garment["id"] for item in still_there.json())

    owner_response = await client.delete(
        f"/api/v1/garments/{garment['id']}", headers={"X-Device-Id": owner_device}
    )
    assert owner_response.status_code == 204
