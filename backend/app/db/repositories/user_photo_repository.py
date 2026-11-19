"""DB access for UserPhoto rows (a user's model photos). Every read/delete
is scoped by `user_id`. Without a choice from the app, a try-on uses the
user's most recent photo.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_photo import UserPhoto


class UserPhotoRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> UserPhoto:
        photo = UserPhoto(**fields)
        self._db.add(photo)
        await self._db.commit()
        await self._db.refresh(photo)
        return photo

    async def get_latest_for_user(self, user_id: UUID) -> UserPhoto | None:
        """The user's newest model photo: what a try-on uses when the app
        doesn't name one."""
        result = await self._db.execute(
            select(UserPhoto)
            .where(UserPhoto.user_id == user_id)
            .order_by(UserPhoto.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(self, photo_id: UUID, user_id: UUID) -> UserPhoto | None:
        """None for a photo that doesn't exist or belongs to someone else."""
        result = await self._db.execute(
            select(UserPhoto).where(UserPhoto.id == photo_id, UserPhoto.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: UUID) -> list[UserPhoto]:
        """Newest first."""
        result = await self._db.execute(
            select(UserPhoto)
            .where(UserPhoto.user_id == user_id)
            .order_by(UserPhoto.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_for_user(self, user_id: UUID) -> int:
        result = await self._db.execute(
            select(func.count()).select_from(UserPhoto).where(UserPhoto.user_id == user_id)
        )
        return int(result.scalar_one())

    async def stage_delete_all_for_user(self, user_id: UUID) -> None:
        """Staged only: the caller commits, so several deletes can share one transaction."""
        await self._db.execute(delete(UserPhoto).where(UserPhoto.user_id == user_id))

    async def delete(self, photo: UserPhoto) -> list[str]:
        """Deletes one photo row; returns its file paths for the caller to
        remove once this has committed."""
        paths = photo_files(photo)
        await self._db.delete(photo)
        await self._db.commit()
        return paths


def photo_files(photo: UserPhoto) -> list[str]:
    """Every stored file belonging to a photo row."""
    return [path for path in (photo.storage_key, photo.cutout_storage_key) if path]
