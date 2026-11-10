"""Moves everything a guest owns into an existing account, then deletes the
emptied guest: used when a guest signs in to an account they already had
(ADR 0014). The caller locks both rows first and commits, so the move and
the sign-in land together or not at all.

Stored files don't move: storage keys aren't per user, so only the owning
rows change. Photos are kept to one per view, as uploads do
(UserPhotoRepository.delete_others_with_angle): the newest of each view
stays, and the files of the others are returned for the caller to delete
once the transaction has committed.
"""

from collections.abc import Iterator
from uuid import UUID

from sqlalchemy import Column, Table, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.repositories.user_photo_repository import photo_files
from app.models.inference_job import InferenceJob
from app.models.profile import Profile
from app.models.user import User
from app.models.user_photo import UserPhoto


def _owner_columns() -> Iterator[tuple[Table, Column]]:
    """Every column pointing at users.id, read from the models, so a table
    added later is moved too instead of blocking the guest's deletion.
    Profiles are left out: one per user, handled separately."""
    for table in Base.metadata.sorted_tables:
        if table.name in (User.__tablename__, Profile.__tablename__):
            continue
        for column in table.columns:
            if any(fk.column.table.name == User.__tablename__ for fk in column.foreign_keys):
                yield table, column


class GuestMergeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def move_everything(self, guest: User, account_id: UUID) -> list[str]:
        """Returns the file paths of photos the account no longer keeps."""
        for table, column in _owner_columns():
            await self._db.execute(
                update(table).where(column == guest.id).values({column.name: account_id})
            )
        await self._move_profile(guest.id, account_id)
        superseded = await self._keep_newest_photo_per_view(account_id)
        await self._db.delete(guest)
        return superseded

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

    async def _keep_newest_photo_per_view(self, account_id: UUID) -> list[str]:
        result = await self._db.execute(
            select(UserPhoto)
            .where(UserPhoto.user_id == account_id)
            .order_by(UserPhoto.created_at.desc())
        )
        seen: set[str] = set()
        superseded: list[str] = []
        for photo in result.scalars().all():
            if photo.angle in seen:
                superseded.extend(photo_files(photo))
                await self._db.delete(photo)
            else:
                seen.add(photo.angle)
        return superseded
