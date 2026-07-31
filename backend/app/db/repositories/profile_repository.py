"""DB access for the (singular, one-per-user) Profile row. Every read/
update is scoped by `user_id` — that scoping, not authentication, is what
keeps one guest from reading or modifying another guest's profile (same
pattern as GarmentRepository/SavedLookRepository). No `list_for_user` here
(unlike those two) since a user has at most one profile, never many.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile


class ProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> Profile:
        profile = Profile(**fields)
        self._db.add(profile)
        await self._db.commit()
        await self._db.refresh(profile)
        return profile

    async def get_by_user_id(self, user_id: UUID) -> Profile | None:
        result = await self._db.execute(select(Profile).where(Profile.user_id == user_id))
        return result.scalar_one_or_none()

    async def update(self, profile: Profile, **fields: Any) -> Profile:
        for key, value in fields.items():
            if value is not None:
                setattr(profile, key, value)
        await self._db.commit()
        await self._db.refresh(profile)
        return profile
