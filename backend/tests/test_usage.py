import io
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.core.config import get_settings
from app.db.repositories.user_repository import UserRepository
from app.models.user import Plan
from app.services.inference_jobs import mark_failed

pytestmark = pytest.mark.usefixtures("real_allowances")


def _jpeg_bytes(color: tuple[int, int, int] = (120, 80, 40)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    return buf.getvalue()


async def _new_user_with_garment_and_photo(client: AsyncClient) -> tuple[str, str]:
    """Returns (device_id, garment_id) for a brand-new guest."""
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"title": "Usage Garment", "category": "Shirts"},
    )
    assert garment.status_code == 201
    device_id = garment.headers["x-device-id"]
    photo = await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.jpg", _jpeg_bytes((10, 20, 30)), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )
    assert photo.status_code == 201
    return device_id, garment.json()["id"]


async def _start_tryon(client: AsyncClient, device_id: str, garment_id: str):
    return await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment_id},
        headers={"X-Device-Id": device_id},
    )


async def _set_plan(device_id: str, plan: Plan) -> None:
    async with db_session.AsyncSessionLocal() as db:
        user = await UserRepository(db).get_by_device_id(device_id)
        assert user is not None
        user.plan = plan
        await db.commit()


async def test_new_user_has_one_free_tryon(client: AsyncClient) -> None:
    device_id, _garment_id = await _new_user_with_garment_and_photo(client)

    response = await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})

    assert response.status_code == 200
    assert response.json() == {
        "plan": "free",
        "period": "lifetime",
        "limit": 1,
        "used": 0,
        "remaining": 1,
        "resets_at": None,
        "unlimited": False,
    }


async def test_free_user_is_blocked_after_one_tryon(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)

    first = await _start_tryon(client, device_id, garment_id)
    second = await _start_tryon(client, device_id, garment_id)

    assert first.status_code == 201
    assert second.status_code == 402
    assert second.json()["detail"]["usage"]["remaining"] == 0


async def test_failed_tryon_does_not_use_up_the_allowance(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    first = await _start_tryon(client, device_id, garment_id)

    async with db_session.AsyncSessionLocal() as db:
        await mark_failed(db, UUID(first.json()["id"]), error_message="provider error")

    usage = await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})
    second = await _start_tryon(client, device_id, garment_id)

    assert usage.json()["remaining"] == 1
    assert second.status_code == 201


async def test_pro_plan_allows_two_per_day(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    await _set_plan(device_id, Plan.PRO)

    results = [await _start_tryon(client, device_id, garment_id) for _ in range(3)]
    usage = (await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})).json()

    assert [r.status_code for r in results] == [201, 201, 402]
    assert usage["plan"] == "pro"
    assert usage["period"] == "day"
    assert usage["limit"] == 2
    assert usage["remaining"] == 0
    assert usage["resets_at"] is not None


async def test_pro_plus_plan_allows_three_per_day(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    await _set_plan(device_id, Plan.PRO_PLUS)

    results = [await _start_tryon(client, device_id, garment_id) for _ in range(4)]

    assert [r.status_code for r in results] == [201, 201, 201, 402]


async def test_stuck_tryon_stops_counting(client: AsyncClient) -> None:
    """A job left queued (e.g. the worker was down) must not use up the
    free try-on forever."""
    from datetime import UTC, datetime, timedelta

    from app.db.repositories.inference_job_repository import InferenceJobRepository

    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    job = await _start_tryon(client, device_id, garment_id)

    async with db_session.AsyncSessionLocal() as db:
        row = await InferenceJobRepository(db).get_by_id(UUID(job.json()["id"]))
        assert row is not None
        row.created_at = datetime.now(UTC) - timedelta(hours=1)
        await db.commit()

    usage = (await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})).json()
    assert usage["remaining"] == 1


async def test_limits_switched_off_means_unlimited(
    client: AsyncClient, real_allowances, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "TRYON_LIMITS_ENABLED", False)

    usage = (await client.get("/api/v1/usage")).json()

    assert usage["unlimited"] is True
    assert usage["remaining"] > 1000

    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    for _ in range(3):  # the free plan allows 1
        assert (await _start_tryon(client, device_id, garment_id)).status_code == 201
