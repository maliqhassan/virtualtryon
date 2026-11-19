import io
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock
from uuid import UUID

from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.models.inference_job import InferenceJobStatus
from app.services.storage import get_storage_service
from app.worker.inference_worker import GENERIC_LOAD_FAILURE_MESSAGE
from app.worker.job_processor import PROCESSING_TIMEOUT, STUCK_JOB_MESSAGE, JobProcessor
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


async def test_process_single_job_fails_cleanly_when_garment_deleted(
    client: AsyncClient,
) -> None:
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


async def test_missing_stored_file_gets_a_generic_error_message(
    client: AsyncClient,
) -> None:
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


async def test_demo_provider_completes_job_with_stored_image(
    client: AsyncClient, monkeypatch
) -> None:
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "TRYON_PROVIDER", "demo")
    job_id, _garment_id, device_id = await _create_garment_and_job(client)

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job_id))

    body = (
        await client.get(f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id})
    ).json()
    assert body["status"] == "completed"
    assert body["generated_image_url"].startswith("/uploads/")
    stored = Image.open(io.BytesIO(get_storage_service().read(body["generated_image_url"])))
    assert stored.format == "PNG"


async def test_stale_queued_job_is_cancelled_not_run(client: AsyncClient) -> None:
    """A job queued longer than STALE_JOB_AFTER no longer counts against the
    allowance, so the worker must cancel it rather than give a free try-on."""
    from datetime import UTC, datetime, timedelta

    from app.db.repositories.inference_job_repository import InferenceJobRepository

    job_id, _garment_id, device_id = await _create_garment_and_job(client)
    async with db_session.AsyncSessionLocal() as db:
        row = await InferenceJobRepository(db).get_by_id(UUID(job_id))
        assert row is not None
        row.created_at = datetime.now(UTC) - timedelta(hours=2)
        await db.commit()

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job_id))

    body = (
        await client.get(f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id})
    ).json()
    assert body["status"] == "failed"
    assert "cancelled" in body["error_message"]


async def test_replacing_photo_does_not_break_a_queued_tryon(
    client: AsyncClient, monkeypatch
) -> None:
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "TRYON_PROVIDER", "demo")
    job_id, _garment_id, device_id = await _create_garment_and_job(client)
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("new.jpg", _jpeg_bytes((1, 2, 3)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job_id))

    body = (
        await client.get(f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id})
    ).json()
    assert body["status"] == "completed"


# A try-on cut off by a deploy or crash (or stuck on a call that never
# returns) is failed once it's older than PROCESSING_TIMEOUT.


async def _set_processing(job_id: str, started_ago: timedelta) -> None:
    async with db_session.AsyncSessionLocal() as db:
        repo = InferenceJobRepository(db)
        job = await repo.get_by_id(UUID(job_id))
        assert job is not None
        await repo.update(
            job,
            status=InferenceJobStatus.PROCESSING,
            started_at=datetime.now(UTC) - started_ago,
        )


async def _fail_stuck_jobs() -> int:
    async with db_session.AsyncSessionLocal() as db:
        return await JobProcessor(db, MagicMock(), MagicMock()).fail_stuck_jobs()


async def _job(client: AsyncClient, job_id: str, device_id: str) -> dict:
    response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 200
    return response.json()


async def test_only_jobs_processing_past_the_timeout_are_failed(
    client: AsyncClient,
) -> None:
    await _fail_stuck_jobs()  # start clean
    stuck_id, _, stuck_device = await _create_garment_and_job(client)
    running_id, _, running_device = await _create_garment_and_job(client)
    queued_id, _, queued_device = await _create_garment_and_job(client)
    await _set_processing(stuck_id, PROCESSING_TIMEOUT + timedelta(minutes=1))
    await _set_processing(running_id, timedelta(seconds=30))

    assert await _fail_stuck_jobs() == 1

    stuck = await _job(client, stuck_id, stuck_device)
    assert stuck["status"] == "failed"
    assert stuck["error_message"] == STUCK_JOB_MESSAGE
    assert stuck["completed_at"] is not None
    assert (await _job(client, running_id, running_device))["status"] == "processing"
    assert (await _job(client, queued_id, queued_device))["status"] == "queued"
    assert await _fail_stuck_jobs() == 0


async def test_each_worker_pass_fails_stuck_jobs(client: AsyncClient) -> None:
    job_id, _, device_id = await _create_garment_and_job(client)
    await _set_processing(job_id, PROCESSING_TIMEOUT * 2)

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).run_once()

    assert (await _job(client, job_id, device_id))["error_message"] == STUCK_JOB_MESSAGE


async def test_a_late_result_does_not_undo_the_failure(client: AsyncClient) -> None:
    job_id, _, device_id = await _create_garment_and_job(client)
    await _set_processing(job_id, PROCESSING_TIMEOUT * 2)
    await _fail_stuck_jobs()

    async with db_session.AsyncSessionLocal() as db:
        completed = await InferenceJobRepository(db).complete_unless_redacted(
            UUID(job_id), "/uploads/late.png", completed_at=datetime.now(UTC)
        )

    assert completed is False
    job = await _job(client, job_id, device_id)
    assert job["status"] == "failed"
    assert job["generated_image_url"] is None


async def test_a_stuck_try_on_is_not_counted(client: AsyncClient, real_allowances) -> None:
    job_id, _, device_id = await _create_garment_and_job(client)
    await _set_processing(job_id, PROCESSING_TIMEOUT * 2)
    await _fail_stuck_jobs()

    usage = await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})
    assert usage.status_code == 200
    assert usage.json()["used"] == 0
