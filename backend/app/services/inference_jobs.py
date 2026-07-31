"""Business logic for the AI inference job pipeline's Stage 1: create and
manage InferenceJob rows only. Per docs/decisions/0008-inference-job-persistence.md
and this feature's approved design brief:

- No inference happens here. No call to `AIInferenceClient` (root `ai/`,
  Phase 12) or `backend/ai/services/ai_client.py` exists in this module —
  those are exactly where a future stage connects real generation, once
  approved. This module only ever writes a status, never an image.
- `mark_processing`/`mark_completed`/`mark_failed` are the connection
  point for a future worker (docs/decisions/0005's still-unimplemented
  `arq` consumer) — they take a bare `job_id`, not a `user_id`, because a
  worker processes a specific job it was queued to run rather than
  fielding a guest-controlled HTTP request; nothing in this module exposes
  them over HTTP (no public PATCH/DELETE for this resource, by design).

No FastAPI import here, same layering rule as garments.py/profiles.py.
"""

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.db.repositories.profile_repository import ProfileRepository
from app.models.inference_job import InferenceJob, InferenceJobStatus
from app.schemas.inference_job import CreateInferenceJobRequest, InferenceJobResponse

logger = logging.getLogger(__name__)


class InvalidGarmentReferenceError(ValueError):
    """Raised on create when `garment_id` doesn't exist *for the resolved
    user* — a garment belonging to a different guest looks identical to a
    nonexistent one from the caller's point of view (same IDOR-prevention
    shape as GarmentNotFoundError/ProfileNotFoundError elsewhere in this
    codebase; a distinct class rather than importing theirs, since each
    feature owns its own domain errors).
    """


class InferenceJobNotFoundError(ValueError):
    """Raised on GET-by-id when no job with that id exists for this user."""


def _to_response(job: InferenceJob) -> InferenceJobResponse:
    return InferenceJobResponse.model_validate(job)


async def create_inference_job(
    db: AsyncSession, user_id: UUID, payload: CreateInferenceJobRequest
) -> InferenceJobResponse:
    garment_repo = GarmentRepository(db)
    garment = await garment_repo.get_by_id_for_user(payload.garment_id, user_id)
    if garment is None:
        raise InvalidGarmentReferenceError(f"No garment {payload.garment_id} for this user")

    # Auto-attached, never client-chosen — see CreateInferenceJobRequest's
    # docstring for why a client-supplied profile_id isn't a field at all.
    profile_repo = ProfileRepository(db)
    profile = await profile_repo.get_by_user_id(user_id)

    repo = InferenceJobRepository(db)
    job = await repo.create(
        user_id=user_id,
        garment_id=garment.id,
        profile_id=profile.id if profile is not None else None,
        user_image_storage_key=payload.user_image_storage_key,
        status=InferenceJobStatus.QUEUED,
    )
    logger.info("inference job created: id=%s user_id=%s", job.id, user_id)
    return _to_response(job)


async def list_inference_jobs(db: AsyncSession, user_id: UUID) -> list[InferenceJobResponse]:
    repo = InferenceJobRepository(db)
    jobs = await repo.list_for_user(user_id)
    return [_to_response(job) for job in jobs]


async def get_inference_job(db: AsyncSession, user_id: UUID, job_id: UUID) -> InferenceJobResponse:
    repo = InferenceJobRepository(db)
    job = await repo.get_by_id_for_user(job_id, user_id)
    if job is None:
        raise InferenceJobNotFoundError(f"No inference job {job_id} for this user")
    return _to_response(job)


async def mark_processing(db: AsyncSession, job_id: UUID) -> InferenceJobResponse:
    """For a future worker only — see module docstring. Not called by
    anything in this stage; exists so that future caller has somewhere to
    land without this module changing shape again."""
    repo = InferenceJobRepository(db)
    job = await repo.get_by_id(job_id)
    if job is None:
        raise InferenceJobNotFoundError(f"No inference job {job_id}")
    job = await repo.update(job, status=InferenceJobStatus.PROCESSING, started_at=datetime.now(UTC))
    return _to_response(job)


async def mark_completed(
    db: AsyncSession, job_id: UUID, generated_image_url: str
) -> InferenceJobResponse:
    """For a future worker only — see module docstring."""
    repo = InferenceJobRepository(db)
    job = await repo.get_by_id(job_id)
    if job is None:
        raise InferenceJobNotFoundError(f"No inference job {job_id}")
    job = await repo.update(
        job,
        status=InferenceJobStatus.COMPLETED,
        generated_image_url=generated_image_url,
        completed_at=datetime.now(UTC),
    )
    return _to_response(job)


async def mark_failed(db: AsyncSession, job_id: UUID, error_message: str) -> InferenceJobResponse:
    """For a future worker only — see module docstring."""
    repo = InferenceJobRepository(db)
    job = await repo.get_by_id(job_id)
    if job is None:
        raise InferenceJobNotFoundError(f"No inference job {job_id}")
    job = await repo.update(
        job,
        status=InferenceJobStatus.FAILED,
        error_message=error_message,
        completed_at=datetime.now(UTC),
    )
    return _to_response(job)
