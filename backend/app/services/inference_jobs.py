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

import asyncio
import logging
from datetime import UTC, datetime
from pathlib import PurePosixPath
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repository import CatalogRepository
from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.db.repositories.profile_repository import ProfileRepository
from app.db.repositories.user_photo_repository import UserPhotoRepository
from app.db.repositories.user_repository import UserRepository
from app.models.inference_job import InferenceJob, InferenceJobStatus
from app.schemas.inference_job import CreateInferenceJobRequest, InferenceJobResponse
from app.services.storage import get_storage_service
from app.services.usage import ensure_tryon_available

logger = logging.getLogger(__name__)


class InvalidGarmentReferenceError(ValueError):
    # Also raised for an unknown product_id: either way the clothing to try
    # on doesn't exist for this caller.
    """Raised on create when `garment_id` doesn't exist *for the resolved
    user* — a garment belonging to a different guest looks identical to a
    nonexistent one from the caller's point of view (same IDOR-prevention
    shape as GarmentNotFoundError/ProfileNotFoundError elsewhere in this
    codebase; a distinct class rather than importing theirs, since each
    feature owns its own domain errors).
    """


class NoUserPhotoError(ValueError):
    """Raised on create when the user hasn't uploaded their photo yet."""


class InferenceJobNotFoundError(ValueError):
    """Raised on GET-by-id when no job with that id exists for this user."""


def _to_response(job: InferenceJob) -> InferenceJobResponse:
    return InferenceJobResponse.model_validate(job)


async def create_inference_job(
    db: AsyncSession, user_id: UUID, payload: CreateInferenceJobRequest
) -> InferenceJobResponse:
    """Raises UsageLimitReachedError (app/services/usage.py) when the user
    has no try-ons left. The user's row is locked first, so the allowance
    check and the job insert happen atomically for that user."""
    user = await UserRepository(db).get_for_update(user_id)
    if user is None:
        raise InferenceJobNotFoundError(f"No user {user_id}")

    garment_id = None
    product_id = None
    if payload.garment_id is not None:
        garment = await GarmentRepository(db).get_by_id_for_user(payload.garment_id, user_id)
        if garment is None:
            raise InvalidGarmentReferenceError(f"No garment {payload.garment_id} for this user")
        garment_id = garment.id
    else:
        assert payload.product_id is not None  # guaranteed by the request validator
        if await CatalogRepository(db).get_product(payload.product_id) is None:
            raise InvalidGarmentReferenceError(f"No product {payload.product_id}")
        product_id = payload.product_id

    photo = await UserPhotoRepository(db).get_latest_for_user(user_id)
    if photo is None:
        raise NoUserPhotoError("Add your photo before starting a try-on.")

    await ensure_tryon_available(db, user)

    # Auto-attached, never client-chosen — see CreateInferenceJobRequest's
    # docstring for why a client-supplied profile_id isn't a field at all.
    profile_repo = ProfileRepository(db)
    profile = await profile_repo.get_by_user_id(user_id)

    # The job keeps its own copy of the photo, so replacing "My photo"
    # later can't break a try-on that's still running or one that's about
    # to be saved to Looks. Deleting the photo deletes these copies too
    # (stage_redact_tryon_images below). Disk I/O runs off the event loop.
    storage = get_storage_service()
    extension = PurePosixPath(photo.storage_key).suffix.lstrip(".") or "jpg"
    job_photo_key = await asyncio.to_thread(
        lambda: storage.save(storage.read(photo.storage_key), extension)
    )

    repo = InferenceJobRepository(db)
    job = await repo.create(
        user_id=user_id,
        garment_id=garment_id,
        product_id=product_id,
        profile_id=profile.id if profile is not None else None,
        user_image_storage_key=job_photo_key,
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


async def stage_redact_tryon_images(db: AsyncSession, user_id: UUID) -> list[str]:
    """Clears every try-on's image references for this user (staged, the
    caller commits) and returns the file paths to delete afterwards. The
    rows stay: they're the usage history the allowance is counted from."""
    paths: list[str] = []
    for job in await InferenceJobRepository(db).list_for_user(user_id):
        paths.extend(p for p in (job.user_image_storage_key, job.generated_image_url) if p)
    await InferenceJobRepository(db).stage_redact_images_for_user(user_id)
    return paths


async def mark_completed_unless_redacted(
    db: AsyncSession, job_id: UUID, generated_image_url: str
) -> bool:
    """For the worker: completes the job atomically unless the user deleted
    their data while it ran. Returns False in that case."""
    return await InferenceJobRepository(db).complete_unless_redacted(
        job_id, generated_image_url, completed_at=datetime.now(UTC)
    )
