"""A daily limit on the photos one user can upload (wardrobe pieces, their
own photos, saved looks), so a single account can't fill the server's disk.
Generous for real use: adding a whole wardrobe in a day is about 40 pieces.

In memory, like the other abuse limits (app/services/attempt_limiter.py),
so a restart resets it. Images the server makes itself (try-on results,
copies into saved looks) aren't counted; they're bounded by try-on limits.
"""

from uuid import UUID

from app.services.attempt_limiter import SlidingWindowLimiter

DAILY_UPLOADS_PER_USER = 60

_per_user = SlidingWindowLimiter(DAILY_UPLOADS_PER_USER, window_seconds=24 * 3600)


class UploadLimitReachedError(Exception):
    pass


def ensure_upload_allowed(user_id: UUID, photos: int = 1) -> None:
    """Counts `photos` uploaded images for `user_id`, or raises
    UploadLimitReachedError when that would pass today's limit. Called once
    a request is known to be valid, so rejected photos don't count."""
    for _ in range(photos):
        if not _per_user.try_acquire(str(user_id)):
            raise UploadLimitReachedError(
                f"You've added {DAILY_UPLOADS_PER_USER} photos today. Please try again tomorrow."
            )


def reset_upload_limits() -> None:
    """For tests."""
    _per_user.reset()
