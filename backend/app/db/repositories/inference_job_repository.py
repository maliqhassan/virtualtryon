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

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select, update
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

    async def count_counted_for_user(
        self, user_id: UUID, since: datetime | None, stale_before: datetime
    ) -> int:
        """Try-ons that count against a user's allowance: completed ones, plus
        ones still queued/processing that started after `stale_before`.
        Failed jobs never count, and neither do jobs stuck in the queue
        (e.g. the worker was down), so a try-on that never produced a
        result never costs the user one. `since=None` counts from the
        beginning (the free plan's lifetime limit)."""
        in_flight = (
            InferenceJob.status.in_([InferenceJobStatus.QUEUED, InferenceJobStatus.PROCESSING])
        ) & (InferenceJob.created_at >= stale_before)
        query = select(func.count()).where(
            InferenceJob.user_id == user_id,
            or_(InferenceJob.status == InferenceJobStatus.COMPLETED, in_flight),
        )
        if since is not None:
            query = query.where(InferenceJob.created_at >= since)
        result = await self._db.execute(query)
        return int(result.scalar_one())

    async def stage_redact_images_for_user(self, user_id: UUID) -> None:
        """Clears image references but keeps the rows, so deleting your data
        can't be used to reset the free try-on allowance. A bulk UPDATE
        because `update()` below deliberately skips None values. Staged
        only: the caller commits."""
        await self._db.execute(
            update(InferenceJob)
            .where(InferenceJob.user_id == user_id)
            .values(user_image_storage_key="", generated_image_url=None)
        )

    async def complete_unless_redacted(
        self, job_id: UUID, generated_image_url: str, completed_at: datetime
    ) -> bool:
        """Marks the job completed in one conditional UPDATE, but only if its
        images haven't been redacted (the user deleted their data while it
        ran). Returns False if nothing was updated."""
        result = await self._db.execute(
            update(InferenceJob)
            .where(InferenceJob.id == job_id, InferenceJob.user_image_storage_key != "")
            .values(
                status=InferenceJobStatus.COMPLETED,
                generated_image_url=generated_image_url,
                completed_at=completed_at,
            )
        )
        await self._db.commit()
        return bool(getattr(result, "rowcount", 0))

    async def update(self, job: InferenceJob, **fields: Any) -> InferenceJob:
        for key, value in fields.items():
            if value is not None:
                setattr(job, key, value)
        await self._db.commit()
        await self._db.refresh(job)
        return job
