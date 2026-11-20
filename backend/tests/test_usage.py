import io
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.core.config import get_settings
from app.db.repositories.user_repository import UserRepository
from app.models.user import Plan
from app.services import plans
from app.services.inference_jobs import mark_failed
from app.services.plans import AllowancePeriod, PlanAllowance
from app.services.usage import current_period

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


async def test_new_user_has_five_free_credits(client: AsyncClient) -> None:
    device_id, _garment_id = await _new_user_with_garment_and_photo(client)

    response = await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})

    assert response.status_code == 200
    assert response.json() == {
        "plan": "free",
        "period": "lifetime",
        "limit": 5,
        "used": 0,
        "remaining": 5,
        "resets_at": None,
        "unlimited": False,
    }


async def test_free_user_is_blocked_after_five_tryons(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)

    results = [await _start_tryon(client, device_id, garment_id) for _ in range(6)]

    assert [r.status_code for r in results] == [201] * 5 + [402]
    assert results[-1].json()["detail"]["usage"]["remaining"] == 0


async def test_failed_tryon_does_not_use_a_credit(client: AsyncClient) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    first = await _start_tryon(client, device_id, garment_id)

    async with db_session.AsyncSessionLocal() as db:
        await mark_failed(db, UUID(first.json()["id"]), error_message="provider error")

    usage = await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})
    after = [await _start_tryon(client, device_id, garment_id) for _ in range(5)]

    assert usage.json()["remaining"] == 5
    # All five can still be used: the failed one isn't charged when starting.
    assert [r.status_code for r in after] == [201] * 5


@pytest.mark.parametrize(
    ("plan", "period", "limit"),
    [(Plan.WEEKLY, "week", 20), (Plan.MONTHLY, "month", 100)],
)
async def test_paid_plans_have_their_credits(
    client: AsyncClient, plan: Plan, period: str, limit: int
) -> None:
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    await _set_plan(device_id, plan)
    assert (await _start_tryon(client, device_id, garment_id)).status_code == 201

    usage = (await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})).json()

    assert usage["plan"] == plan.value
    assert usage["period"] == period
    assert usage["limit"] == limit
    assert usage["remaining"] == limit - 1
    assert usage["resets_at"] is not None


async def test_weekly_plan_is_blocked_after_twenty(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Fewer credits so the test stays quick; the same code path as 20.
    monkeypatch.setitem(plans.PLAN_ALLOWANCES, Plan.WEEKLY, PlanAllowance(2, AllowancePeriod.WEEK))
    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    await _set_plan(device_id, Plan.WEEKLY)

    results = [await _start_tryon(client, device_id, garment_id) for _ in range(3)]

    assert [r.status_code for r in results] == [201, 201, 402]


def test_twenty_and_a_hundred_are_the_real_allowances() -> None:
    assert plans.PLAN_ALLOWANCES[Plan.WEEKLY] == PlanAllowance(20, AllowancePeriod.WEEK)
    assert plans.PLAN_ALLOWANCES[Plan.MONTHLY] == PlanAllowance(100, AllowancePeriod.MONTH)


@pytest.mark.parametrize(
    ("now", "start", "renews"),
    [
        # Thursday -> that week's Monday, renews the next Monday.
        (
            datetime(2026, 11, 19, 15, 30, tzinfo=UTC),
            datetime(2026, 11, 16, tzinfo=UTC),
            datetime(2026, 11, 23, tzinfo=UTC),
        ),
        # Sunday just before midnight is still the same week.
        (
            datetime(2026, 11, 22, 23, 59, tzinfo=UTC),
            datetime(2026, 11, 16, tzinfo=UTC),
            datetime(2026, 11, 23, tzinfo=UTC),
        ),
        # Monday 00:00 starts a new one.
        (
            datetime(2026, 11, 23, tzinfo=UTC),
            datetime(2026, 11, 23, tzinfo=UTC),
            datetime(2026, 11, 30, tzinfo=UTC),
        ),
    ],
)
def test_week_runs_monday_to_monday(now: datetime, start: datetime, renews: datetime) -> None:
    assert current_period(AllowancePeriod.WEEK, now) == (start, renews)


def test_month_runs_from_the_first_and_across_the_year() -> None:
    assert current_period(AllowancePeriod.MONTH, datetime(2026, 11, 19, 8, tzinfo=UTC)) == (
        datetime(2026, 11, 1, tzinfo=UTC),
        datetime(2026, 12, 1, tzinfo=UTC),
    )
    assert current_period(AllowancePeriod.MONTH, datetime(2026, 12, 31, 23, tzinfo=UTC)) == (
        datetime(2026, 12, 1, tzinfo=UTC),
        datetime(2027, 1, 1, tzinfo=UTC),
    )


def test_free_credits_never_renew() -> None:
    assert current_period(AllowancePeriod.LIFETIME, datetime.now(UTC)) == (None, None)


async def test_stuck_tryon_stops_counting(client: AsyncClient) -> None:
    """A job left queued (e.g. the worker was down) must not use up a
    free credit forever."""
    from app.db.repositories.inference_job_repository import InferenceJobRepository

    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    job = await _start_tryon(client, device_id, garment_id)

    async with db_session.AsyncSessionLocal() as db:
        row = await InferenceJobRepository(db).get_by_id(UUID(job.json()["id"]))
        assert row is not None
        row.created_at = datetime.now(UTC) - timedelta(hours=1)
        await db.commit()

    usage = (await client.get("/api/v1/usage", headers={"X-Device-Id": device_id})).json()
    assert usage["remaining"] == 5


async def test_limits_switched_off_means_unlimited(
    client: AsyncClient, real_allowances, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "TRYON_LIMITS_ENABLED", False)

    usage = (await client.get("/api/v1/usage")).json()

    assert usage["unlimited"] is True
    assert usage["remaining"] > 1000

    device_id, garment_id = await _new_user_with_garment_and_photo(client)
    for _ in range(6):  # the free plan allows 5
        assert (await _start_tryon(client, device_id, garment_id)).status_code == 201
