import io
from uuid import UUID

from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.db.repositories.garment_repository import GarmentRepository
from app.services.storage import get_storage_service
from app.worker.inference_worker import GENERIC_LOAD_FAILURE_MESSAGE
from app.worker.worker_service import WorkerService


def _jpeg_bytes(color: tuple[int, int, int] = (40, 160, 90)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def _create_garment_and_job(client: AsyncClient) -> tuple[str, str, str]:
    """Returns (job_id, garment_id, device_id)."""
    garment_response = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Worker Test Garment", "category": "tops"},
    )
    assert garment_response.status_code == 201
    device_id = garment_response.headers["x-device-id"]
    garment_id = garment_response.json()["id"]

    photo_response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("photo.jpg", _jpeg_bytes((10, 10, 200)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )
    assert photo_response.status_code == 201
    storage_key = photo_response.json()["storage_key"]

    job_response = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment_id, "user_image_storage_key": storage_key},
        headers={"X-Device-Id": device_id},
    )
    assert job_response.status_code == 201
    return job_response.json()["id"], garment_id, device_id


async def test_process_single_job_result_via_owner(client: AsyncClient) -> None:
    job_id, _garment_id, device_id = await _create_garment_and_job(client)

    async with db_session.AsyncSessionLocal() as db:
        worker_service = WorkerService(db)
        await worker_service.process_single_job(UUID(job_id))

    response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["error_message"] is not None
    assert "CatVTON" in body["error_message"]
    assert body["started_at"] is not None
    assert body["completed_at"] is not None


async def test_process_single_job_missing_job_is_a_noop(client: AsyncClient) -> None:
    async with db_session.AsyncSessionLocal() as db:
        worker_service = WorkerService(db)
        # Should not raise for an id that doesn't exist.
        await worker_service.process_single_job(UUID("00000000-0000-0000-0000-000000000000"))


async def test_process_single_job_fails_cleanly_when_garment_deleted(client: AsyncClient) -> None:
    job_id, garment_id, device_id = await _create_garment_and_job(client)

    async with db_session.AsyncSessionLocal() as db:
        garment_repo = GarmentRepository(db)
        garment = await garment_repo.get_by_id(UUID(garment_id))
        assert garment is not None
        await garment_repo.delete(garment)

    async with db_session.AsyncSessionLocal() as db:
        worker_service = WorkerService(db)
        await worker_service.process_single_job(UUID(job_id))

    response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["error_message"] == "Referenced garment no longer exists."


async def test_missing_stored_file_gets_a_generic_error_message(client: AsyncClient) -> None:
    """A security-review finding, fixed: the raw FileNotFoundError text
    (which contains the server's storage directory layout) must never
    reach InferenceJob.error_message, which this guest can read back via
    the existing GET endpoint."""
    job_id, _garment_id, device_id = await _create_garment_and_job(client)

    job_response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    storage_key = job_response.json()["user_image_storage_key"]
    get_storage_service().delete(storage_key)

    async with db_session.AsyncSessionLocal() as db:
        worker_service = WorkerService(db)
        await worker_service.process_single_job(UUID(job_id))

    response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    body = response.json()
    assert body["status"] == "failed"
    assert body["error_message"] == GENERIC_LOAD_FAILURE_MESSAGE
    assert "storage" not in body["error_message"].lower()
    assert "uploads" not in body["error_message"].lower()


async def test_run_once_processes_every_queued_job(client: AsyncClient) -> None:
    job_id_1, _garment_1, device_id_1 = await _create_garment_and_job(client)
    job_id_2, _garment_2, device_id_2 = await _create_garment_and_job(client)

    async with db_session.AsyncSessionLocal() as db:
        worker_service = WorkerService(db)
        result = await worker_service.run_once()

    # at least the two created above (a real DB, not isolated)
    assert result.jobs_found >= 2
    assert result.jobs_processed >= 2
    assert result.jobs_failed >= 2
    assert result.jobs_completed == 0

    for job_id, device_id in [(job_id_1, device_id_1), (job_id_2, device_id_2)]:
        response = await client.get(
            f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
        )
        assert response.json()["status"] == "failed"
