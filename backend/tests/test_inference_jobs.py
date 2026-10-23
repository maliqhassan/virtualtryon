import io
from uuid import UUID

from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.services.inference_jobs import mark_completed, mark_failed, mark_processing


def _jpeg_bytes(color: tuple[int, int, int] = (10, 90, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def _create_garment(client: AsyncClient) -> tuple[dict, str]:
    """Mirrors test_garments.py's helper: a brand-new client, no device id
    sent, returns the server-issued one alongside the created garment."""
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Test Garment", "category": "tops"},
    )
    assert response.status_code == 201
    return response.json(), response.headers["x-device-id"]


async def _upload_photo(client: AsyncClient, device_id: str) -> str:
    response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("photo.jpg", _jpeg_bytes((200, 180, 160)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 201
    return response.json()["storage_key"]


async def _create_job(client: AsyncClient, garment_id: str, device_id: str) -> dict:
    """Uploads the user's photo (if not already there) and starts a job."""
    current = await client.get("/api/v1/user-photos/current", headers={"X-Device-Id": device_id})
    if current.json() is None:
        await _upload_photo(client, device_id)
    response = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment_id},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 201
    return response.json()


async def test_create_job_success(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)
    storage_key = await _upload_photo(client, device_id)

    job = await _create_job(client, garment["id"], device_id)

    assert job["garment_id"] == garment["id"]
    assert job["profile_id"] is None
    # The job keeps its own copy of the photo (so replacing the photo later
    # can't break it), not a reference to the original file.
    assert job["user_image_storage_key"].startswith("/uploads/")
    assert job["user_image_storage_key"] != storage_key
    assert job["generated_image_url"] is None
    assert job["status"] == "queued"
    assert job["error_message"] is None
    assert job["started_at"] is None
    assert job["completed_at"] is None


async def test_create_job_ignores_client_supplied_storage_key(
    client: AsyncClient,
) -> None:
    """The job always uses the caller's own current photo; a storage key in
    the request body (old clients sent one) is ignored, so a request can't
    point a job at a file the caller doesn't own."""
    garment, device_id = await _create_garment(client)
    storage_key = await _upload_photo(client, device_id)

    response = await client.post(
        "/api/v1/inference-jobs",
        json={
            "garment_id": garment["id"],
            "user_image_storage_key": "/uploads/someone-else.jpg",
        },
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 201
    key = response.json()["user_image_storage_key"]
    assert key not in ("/uploads/someone-else.jpg", storage_key)
    assert key.startswith("/uploads/")


async def test_create_job_without_photo_returns_409(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)

    response = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment["id"]},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 409


async def test_create_job_with_nonexistent_garment_returns_404(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 404


async def test_create_job_with_garment_from_different_device_returns_404(
    client: AsyncClient,
) -> None:
    garment, _owner_device = await _create_garment(client)

    response = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment["id"]},
        headers={"X-Device-Id": "attacker-device"},
    )
    assert response.status_code == 404


async def test_create_job_auto_attaches_profile_if_exists(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)

    profile_response = await client.post(
        "/api/v1/profile",
        json={"height_cm": 175, "weight_kg": 70},
        headers={"X-Device-Id": device_id},
    )
    assert profile_response.status_code == 201
    profile_id = profile_response.json()["id"]

    job = await _create_job(client, garment["id"], device_id)
    assert job["profile_id"] == profile_id


async def test_create_job_without_profile_leaves_profile_id_null(
    client: AsyncClient,
) -> None:
    garment, device_id = await _create_garment(client)

    job = await _create_job(client, garment["id"], device_id)
    assert job["profile_id"] is None


async def test_list_jobs_scoped_to_device(client: AsyncClient) -> None:
    garment, device_a = await _create_garment(client)
    job = await _create_job(client, garment["id"], device_a)

    response_a = await client.get("/api/v1/inference-jobs", headers={"X-Device-Id": device_a})
    response_b = await client.get("/api/v1/inference-jobs")  # a genuinely different, new guest

    assert any(item["id"] == job["id"] for item in response_a.json())
    assert not any(item["id"] == job["id"] for item in response_b.json())


async def test_get_job_by_id(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)
    job = await _create_job(client, garment["id"], device_id)

    response = await client.get(
        f"/api/v1/inference-jobs/{job['id']}", headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 200
    assert response.json()["id"] == job["id"]


async def test_get_job_from_wrong_device_returns_404(client: AsyncClient) -> None:
    garment, owner_device = await _create_garment(client)
    job = await _create_job(client, garment["id"], owner_device)

    response = await client.get(
        f"/api/v1/inference-jobs/{job['id']}",
        headers={"X-Device-Id": "attacker-device"},
    )
    assert response.status_code == 404


async def test_no_patch_or_delete_endpoints_exist(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)
    job = await _create_job(client, garment["id"], device_id)
    headers = {"X-Device-Id": device_id}

    patch_collection = await client.patch("/api/v1/inference-jobs", json={}, headers=headers)
    delete_collection = await client.delete("/api/v1/inference-jobs", headers=headers)
    patch_item = await client.patch(f"/api/v1/inference-jobs/{job['id']}", json={}, headers=headers)
    delete_item = await client.delete(f"/api/v1/inference-jobs/{job['id']}", headers=headers)

    assert patch_collection.status_code == 405
    assert delete_collection.status_code == 405
    assert patch_item.status_code == 405
    assert delete_item.status_code == 405


async def test_service_layer_status_transitions(client: AsyncClient) -> None:
    """mark_processing/mark_completed/mark_failed have no HTTP surface by
    design (docs/decisions/0008) — exercised directly, standing in for the
    future worker that will call them."""
    garment, device_id = await _create_garment(client)
    job = await _create_job(client, garment["id"], device_id)

    job_id = UUID(job["id"])
    async with db_session.AsyncSessionLocal() as db:
        processing = await mark_processing(db, job_id)
        assert processing.status == "processing"
        assert processing.started_at is not None
        assert processing.completed_at is None

    async with db_session.AsyncSessionLocal() as db:
        completed = await mark_completed(db, job_id, generated_image_url="/uploads/result.png")
        assert completed.status == "completed"
        assert completed.generated_image_url == "/uploads/result.png"
        assert completed.completed_at is not None


async def test_service_layer_mark_failed(client: AsyncClient) -> None:
    garment, device_id = await _create_garment(client)
    job = await _create_job(client, garment["id"], device_id)

    async with db_session.AsyncSessionLocal() as db:
        failed = await mark_failed(
            db, UUID(job["id"]), error_message="inference backend unreachable"
        )
        assert failed.status == "failed"
        assert failed.error_message == "inference backend unreachable"
        assert failed.completed_at is not None
