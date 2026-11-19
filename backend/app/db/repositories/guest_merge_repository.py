"""Moves everything a guest owns into an existing account, then deletes the
emptied guest: used when a guest signs in to an account they already had
(ADR 0014). The caller locks both rows first and commits, so the move and
the sign-in land together or not at all.

Stored files don't move: storage keys aren't per user, so only the owning
rows change. Every model photo moves, even past the per-user limit
(MAX_PHOTOS_PER_USER): nothing of the user's is deleted without asking; they
just can't add more until they're under it again.
"""

from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.ownership import owner_columns
from app.models.inference_job import InferenceJob
from app.models.profile import Profile
from app.models.user import User


class GuestMergeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def move_everything(self, guest: User, account_id: UUID) -> list[str]:
        """Returns file paths to delete after the commit: none today (every
        photo is kept), kept in the signature for the caller in auth.py."""
        # Profiles are left out: one per user, handled separately.
        for table, column in owner_columns(skip=(Profile.__tablename__,)):
            await self._db.execute(
                update(table).where(column == guest.id).values({column.name: account_id})
            )
        await self._move_profile(guest.id, account_id)
        await self._db.delete(guest)
        return []

    async def _move_profile(self, guest_id: UUID, account_id: UUID) -> None:
        """The account's own style profile wins; the guest's moves only if the
        account has none. Moved try-ons keep pointing at a profile."""
        account_profile = await self._db.scalar(
            select(Profile.id).where(Profile.user_id == account_id)
        )
        guest_profile = await self._db.scalar(select(Profile.id).where(Profile.user_id == guest_id))
        if guest_profile is None:
            return
        if account_profile is None:
            await self._db.execute(
                update(Profile).where(Profile.id == guest_profile).values(user_id=account_id)
            )
            return
        await self._db.execute(
            update(InferenceJob)
            .where(InferenceJob.profile_id == guest_profile)
            .values(profile_id=account_profile)
        )
        await self._db.execute(delete(Profile).where(Profile.id == guest_profile))
