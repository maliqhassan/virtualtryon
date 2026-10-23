import io
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.services.inference_jobs import mark_completed
from app.services.storage import get_storage_service


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="PNG")
    return buf.getvalue()


async def _completed_tryon(client: AsyncClient) -> tuple[str, dict, dict]:
    """Returns (device_id, garment, job) for a job marked completed with a
    real stored result image."""
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png_bytes((200, 10, 10)), "image/png")},
        data={"title": "Red Kurta", "category": "Shirts"},
    )
    device_id = garment.headers["x-device-id"]
    headers = {"X-Device-Id": device_id}
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png_bytes((10, 10, 200)), "image/png")},
        headers=headers,
    )
    job = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment.json()["id"]},
        headers=headers,
    )
    result_url = get_storage_service().save(_png_bytes((10, 200, 10)), "png")
    async with db_session.AsyncSessionLocal() as db:
        await mark_completed(db, UUID(job.json()["id"]), generated_image_url=result_url)
    refreshed = await client.get(f"/api/v1/inference-jobs/{job.json()['id']}", headers=headers)
    return device_id, garment.json(), refreshed.json()


async def test_save_completed_tryon_copies_images(client: AsyncClient) -> None:
    device_id, garment, job = await _completed_tryon(client)

    response = await client.post(
        "/api/v1/saved-looks/from-job",
        json={"job_id": job["id"]},
        headers={"X-Device-Id": device_id},
    )

    assert response.status_code == 201
    look = response.json()
    assert look["title"] == "Red Kurta"
    assert look["inference_job_id"] == job["id"]
    # Copies, not shared references to the originals.
    assert look["clothing_image_url"] != garment["image_url"]
    assert look["user_image_url"] != job["user_image_storage_key"]
    assert look["generated_image_url"] != job["generated_image_url"]


async def test_saving_twice_returns_the_same_look(client: AsyncClient) -> None:
    device_id, _garment, job = await _completed_tryon(client)
    headers = {"X-Device-Id": device_id}

    first = await client.post(
        "/api/v1/saved-looks/from-job", json={"job_id": job["id"]}, headers=headers
    )
    second = await client.post(
        "/api/v1/saved-looks/from-job", json={"job_id": job["id"]}, headers=headers
    )

    assert first.json()["id"] == second.json()["id"]


async def test_deleting_the_look_keeps_wardrobe_and_photo_files(
    client: AsyncClient,
) -> None:
    device_id, garment, job = await _completed_tryon(client)
    headers = {"X-Device-Id": device_id}
    look = await client.post(
        "/api/v1/saved-looks/from-job", json={"job_id": job["id"]}, headers=headers
    )

    await client.delete(f"/api/v1/saved-looks/{look.json()['id']}", headers=headers)

    storage = get_storage_service()
    assert storage.read(garment["image_url"])
    assert storage.read(job["user_image_storage_key"])


async def test_unfinished_tryon_cannot_be_saved(client: AsyncClient) -> None:
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png_bytes((1, 1, 1)), "image/png")},
        data={"title": "Shirt", "category": "Shirts"},
    )
    headers = {"X-Device-Id": garment.headers["x-device-id"]}
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png_bytes((2, 2, 2)), "image/png")},
        headers=headers,
    )
    job = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment.json()["id"]},
        headers=headers,
    )

    response = await client.post(
        "/api/v1/saved-looks/from-job",
        json={"job_id": job.json()["id"]},
        headers=headers,
    )

    assert response.status_code == 409


@pytest.mark.parametrize("device", ["attacker-device"])
async def test_other_users_tryon_returns_404(client: AsyncClient, device: str) -> None:
    _device_id, _garment, job = await _completed_tryon(client)

    response = await client.post(
        "/api/v1/saved-looks/from-job",
        json={"job_id": job["id"]},
        headers={"X-Device-Id": device},
    )

    assert response.status_code == 404
