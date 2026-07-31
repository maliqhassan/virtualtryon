"""DB access for SavedLook rows. Every read/update/delete is scoped by
`user_id` — that scoping, not authentication, is what keeps one guest from
reading or modifying another guest's saved looks (see
app/services/guest_identity.py and docs/decisions for the full reasoning).
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_look import SavedLook


class SavedLookRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> SavedLook:
        look = SavedLook(**fields)
        self._db.add(look)
        await self._db.commit()
        await self._db.refresh(look)
        return look

    async def list_for_user(self, user_id: UUID) -> list[SavedLook]:
        result = await self._db.execute(
            select(SavedLook)
            .where(SavedLook.user_id == user_id)
            .order_by(SavedLook.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(self, look_id: UUID, user_id: UUID) -> SavedLook | None:
        result = await self._db.execute(
            select(SavedLook).where(SavedLook.id == look_id, SavedLook.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update(self, look: SavedLook, **fields: Any) -> SavedLook:
        for key, value in fields.items():
            if value is not None:
                setattr(look, key, value)
        await self._db.commit()
        await self._db.refresh(look)
        return look

    async def delete(self, look: SavedLook) -> None:
        await self._db.delete(look)
        await self._db.commit()
