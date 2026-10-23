"""Counts a user's try-ons against their plan's allowance (app/services/plans.py).

Usage is derived from InferenceJob rows rather than a separate counter:
completed jobs count, and so do jobs still in progress for up to
STALE_JOB_AFTER. Failed or stuck jobs never cost the user a try-on. No FastAPI import here, same layering rule as every
other service.
"""

from datetime import UTC, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.models.user import User
from app.schemas.usage import UsageResponse
from app.services.plans import AllowancePeriod, get_allowance

# Longer than any real generation takes; a job still queued after this is
# treated as stuck and stops counting against the allowance.
STALE_JOB_AFTER = timedelta(minutes=30)


class UsageLimitReachedError(Exception):
    """Raised when a user has no try-ons left on their current plan."""

    def __init__(self, usage: UsageResponse) -> None:
        super().__init__("No try-ons left on the current plan.")
        self.usage = usage


def _start_of_today_utc(now: datetime) -> datetime:
    return datetime.combine(now.date(), time.min, tzinfo=UTC)


async def get_usage(db: AsyncSession, user: User, now: datetime | None = None) -> UsageResponse:
    now = now or datetime.now(UTC)
    allowance = get_allowance(user.plan)

    since: datetime | None = None
    resets_at: datetime | None = None
    if allowance.period is AllowancePeriod.DAY:
        since = _start_of_today_utc(now)
        resets_at = since + timedelta(days=1)

    used = await InferenceJobRepository(db).count_counted_for_user(
        user.id, since, stale_before=now - STALE_JOB_AFTER
    )
    return UsageResponse(
        plan=user.plan,
        period=allowance.period,
        limit=allowance.limit,
        used=used,
        remaining=max(allowance.limit - used, 0),
        resets_at=resets_at,
    )


async def ensure_tryon_available(db: AsyncSession, user: User) -> None:
    """Call with the user's row already locked (UserRepository.get_for_update)
    and in the same transaction that creates the job."""
    usage = await get_usage(db, user)
    if usage.remaining <= 0:
        raise UsageLimitReachedError(usage)
