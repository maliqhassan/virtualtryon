import asyncio
import io
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from PIL import Image

from app.worker.worker_runner import WorkerRunner


def _jpeg_bytes(color: tuple[int, int, int] = (90, 40, 160)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def _create_queued_job(client: AsyncClient) -> tuple[str, str]:
    """Returns (job_id, device_id)."""
    garment_response = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Runner Test Garment", "category": "tops"},
    )
    assert garment_response.status_code == 201
    device_id = garment_response.headers["x-device-id"]
    garment_id = garment_response.json()["id"]

    photo_response = await client.post(
        "/api/v1/user-photos",
        files={"image": ("photo.jpg", _jpeg_bytes((5, 5, 5)), "image/jpeg")},
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
    return job_response.json()["id"], device_id


async def test_run_iteration_processes_real_queued_jobs(client: AsyncClient) -> None:
    job_id, device_id = await _create_queued_job(client)

    runner = WorkerRunner(poll_interval_seconds=5.0)
    await runner._run_iteration()

    response = await client.get(
        f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id}
    )
    assert response.json()["status"] == "failed"


async def test_run_iteration_recovers_from_unexpected_exception() -> None:
    """A bad iteration must never propagate — the whole point of this
    method existing separately from run()'s loop."""
    runner = WorkerRunner(poll_interval_seconds=5.0)

    with patch("app.worker.worker_runner.WorkerService", side_effect=RuntimeError("boom")):
        await runner._run_iteration()  # must not raise


async def test_request_shutdown_stops_the_loop_promptly() -> None:
    runner = WorkerRunner(poll_interval_seconds=10.0)  # deliberately long

    with patch.object(
        runner, "_run_iteration", new=AsyncMock(return_value=None)
    ) as mocked_iteration:
        run_task = asyncio.create_task(runner.run())
        await asyncio.sleep(0.05)  # let one iteration happen
        runner.request_shutdown()
        await asyncio.wait_for(run_task, timeout=2.0)  # would hang ~10s if not interrupted

    assert mocked_iteration.await_count >= 1


async def test_shutdown_during_sleep_is_interrupted_immediately() -> None:
    """Requesting shutdown mid-sleep must not wait out the remaining
    interval — this is what makes the sleep itself interruptible rather
    than a bare asyncio.sleep()."""
    runner = WorkerRunner(poll_interval_seconds=30.0)  # would hang if not interrupted

    with patch.object(runner, "_run_iteration", new=AsyncMock(return_value=None)):
        run_task = asyncio.create_task(runner.run())
        await asyncio.sleep(0.05)
        runner.request_shutdown()
        await asyncio.wait_for(run_task, timeout=2.0)
