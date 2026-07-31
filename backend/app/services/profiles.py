"""Business logic for the Profile feature (physical measurements for
virtual try-on fit/sizing) — a distinct concept from the future
StyleProfile (aesthetic preferences, docs/roadmap/phase-b-platform.md
Milestone 8), not to be merged. No FastAPI import here, same layering
rule as saved_looks.py/garments.py.
"""

import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.profile_repository import ProfileRepository
from app.models.profile import Profile
from app.schemas.profile import CreateProfileRequest, ProfileResponse, UpdateProfileRequest

logger = logging.getLogger(__name__)


class ProfileAlreadyExistsError(ValueError):
    """Raised on POST when a profile already exists for this user — only
    one profile may exist per guest (also enforced at the DB level by
    `Profile.user_id`'s unique constraint; this check exists to produce a
    clean 409 instead of letting an IntegrityError surface).
    """


class ProfileNotFoundError(ValueError):
    """Raised on PATCH when no profile exists yet for this user — nothing
    to update.
    """


def _to_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse.model_validate(profile)


async def get_profile(db: AsyncSession, user_id: UUID) -> ProfileResponse | None:
    repo = ProfileRepository(db)
    profile = await repo.get_by_user_id(user_id)
    return _to_response(profile) if profile is not None else None


async def create_profile(
    db: AsyncSession, user_id: UUID, payload: CreateProfileRequest
) -> ProfileResponse:
    repo = ProfileRepository(db)
    existing = await repo.get_by_user_id(user_id)
    if existing is not None:
        raise ProfileAlreadyExistsError(f"Profile already exists for user {user_id}")

    try:
        profile = await repo.create(
            user_id=user_id,
            display_name=payload.display_name,
            age=payload.age,
            gender=payload.gender,
            height_cm=payload.height_cm,
            weight_kg=payload.weight_kg,
            body_type=payload.body_type,
            preferred_fit=payload.preferred_fit,
        )
    except IntegrityError as exc:
        # The check above is check-then-insert, not atomic — two
        # near-simultaneous POSTs from the same guest can both pass it
        # before either commits. The DB's own unique constraint on
        # user_id is the real guard; this converts that race's failure
        # mode from an unhandled 500 into the same clean 409 a
        # non-racing second request already gets.
        await db.rollback()
        raise ProfileAlreadyExistsError(f"Profile already exists for user {user_id}") from exc

    logger.info("profile created: id=%s user_id=%s", profile.id, user_id)
    return _to_response(profile)


async def update_profile(
    db: AsyncSession, user_id: UUID, payload: UpdateProfileRequest
) -> ProfileResponse:
    repo = ProfileRepository(db)
    profile = await repo.get_by_user_id(user_id)
    if profile is None:
        raise ProfileNotFoundError(f"No profile exists yet for user {user_id}")

    profile = await repo.update(
        profile,
        display_name=payload.display_name,
        age=payload.age,
        gender=payload.gender,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        body_type=payload.body_type,
        preferred_fit=payload.preferred_fit,
    )
    logger.info("profile updated: id=%s user_id=%s", profile.id, user_id)
    return _to_response(profile)
