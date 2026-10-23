"""DB access for UserPhoto rows. Every read/delete is scoped by `user_id`.
A user's "current" photo is simply their most recent one.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
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

    async def get_latest_for_user(self, user_id: UUID, angle: str = "front") -> UserPhoto | None:
        result = await self._db.execute(
            select(UserPhoto)
            .where(UserPhoto.user_id == user_id, UserPhoto.angle == angle)
            .order_by(UserPhoto.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: UUID) -> list[UserPhoto]:
        result = await self._db.execute(select(UserPhoto).where(UserPhoto.user_id == user_id))
        return list(result.scalars().all())

    async def stage_delete_all_for_user(self, user_id: UUID) -> None:
        """Staged only: the caller commits, so several deletes can share one transaction."""
        await self._db.execute(delete(UserPhoto).where(UserPhoto.user_id == user_id))

    async def delete_others_with_angle(self, user_id: UUID, keep_id: UUID, angle: str) -> list[str]:
        """Deletes the user's other photos of the same view; returns their file
        paths (originals and cut-outs) so the caller can remove the files."""
        result = await self._db.execute(
            select(UserPhoto).where(
                UserPhoto.user_id == user_id,
                UserPhoto.angle == angle,
                UserPhoto.id != keep_id,
            )
        )
        old = list(result.scalars().all())
        for photo in old:
            await self._db.delete(photo)
        await self._db.commit()
        return [path for photo in old for path in photo_files(photo)]


def photo_files(photo: UserPhoto) -> list[str]:
    """Every stored file belonging to a photo row."""
    return [path for path in (photo.storage_key, photo.cutout_storage_key) if path]
