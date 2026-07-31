"""DB access for Garment rows. Every read/update/delete is scoped by
`user_id` — that scoping, not authentication, is what keeps one guest from
reading or modifying another guest's garments (same pattern as
SavedLookRepository).
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.garment import Garment


class GarmentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> Garment:
        garment = Garment(**fields)
        self._db.add(garment)
        await self._db.commit()
        await self._db.refresh(garment)
        return garment

    async def list_for_user(self, user_id: UUID) -> list[Garment]:
        result = await self._db.execute(
            select(Garment).where(Garment.user_id == user_id).order_by(Garment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(self, garment_id: UUID, user_id: UUID) -> Garment | None:
        result = await self._db.execute(
            select(Garment).where(Garment.id == garment_id, Garment.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, garment_id: UUID) -> Garment | None:
        """Unscoped — for the worker's internal use (app/worker/), same
        reasoning as InferenceJobRepository.get_by_id: a worker processes a
        specific job's already-resolved garment reference, not a
        guest-controlled HTTP request, so IDOR scoping doesn't apply."""
        result = await self._db.execute(select(Garment).where(Garment.id == garment_id))
        return result.scalar_one_or_none()

    async def update(self, garment: Garment, **fields: Any) -> Garment:
        for key, value in fields.items():
            if value is not None:
                setattr(garment, key, value)
        await self._db.commit()
        await self._db.refresh(garment)
        return garment

    async def delete(self, garment: Garment) -> None:
        await self._db.delete(garment)
        await self._db.commit()
