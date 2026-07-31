"""DB access for InferenceJob rows. Two different lookup shapes for two
different callers:

- `get_by_id_for_user` — scoped by `user_id`, for HTTP endpoints (the
  IDOR-prevention pattern every other repository in this codebase uses).
- `get_by_id` — unscoped, for the future worker's internal status-transition
  calls (`app/services/inference_jobs.py`'s `mark_processing`/
  `mark_completed`/`mark_failed`). A worker processes a specific job it was
  queued to run; it isn't fielding a guest-controlled HTTP request, so the
  IDOR concern that scoping exists for doesn't apply to it.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inference_job import InferenceJob, InferenceJobStatus


class InferenceJobRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> InferenceJob:
        job = InferenceJob(**fields)
        self._db.add(job)
        await self._db.commit()
        await self._db.refresh(job)
        return job

    async def list_for_user(self, user_id: UUID) -> list[InferenceJob]:
        result = await self._db.execute(
            select(InferenceJob)
            .where(InferenceJob.user_id == user_id)
            .order_by(InferenceJob.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(self, job_id: UUID, user_id: UUID) -> InferenceJob | None:
        result = await self._db.execute(
            select(InferenceJob).where(InferenceJob.id == job_id, InferenceJob.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, job_id: UUID) -> InferenceJob | None:
        result = await self._db.execute(select(InferenceJob).where(InferenceJob.id == job_id))
        return result.scalar_one_or_none()

    async def list_queued(self) -> list[InferenceJob]:
        """Unscoped, across every guest — the worker (app/worker/) processes
        whatever is queued regardless of whose it is; same reasoning as
        `get_by_id`."""
        result = await self._db.execute(
            select(InferenceJob)
            .where(InferenceJob.status == InferenceJobStatus.QUEUED)
            .order_by(InferenceJob.created_at.asc())
        )
        return list(result.scalars().all())

    async def update(self, job: InferenceJob, **fields: Any) -> InferenceJob:
        for key, value in fields.items():
            if value is not None:
                setattr(job, key, value)
        await self._db.commit()
        await self._db.refresh(job)
        return job
