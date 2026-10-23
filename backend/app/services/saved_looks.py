"""Business logic for the Saved Looks feature. No FastAPI import here —
this repo's layering rule (app/api/ calls app/services/; services stay
framework-agnostic). The endpoint layer reads each UploadFile into an
ImageUpload before calling in, and translates whatever this raises into an
HTTP status code.
"""

import asyncio
import logging
from pathlib import PurePosixPath
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.db.repositories.saved_look_repository import SavedLookRepository
from app.models.inference_job import InferenceJobStatus
from app.models.saved_look import SavedLook
from app.schemas.saved_look import (
    SavedLookResponse,
    SavedLookUpdate,
    SaveLookFromJobRequest,
)
from app.services.clothing import resolve_job_clothing
from app.services.image_validation import ImageUpload, validate_image
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


class SavedLookNotFoundError(ValueError):
    """Raised when a look_id doesn't exist *for the resolved user* — a
    look belonging to a different guest looks identical to a nonexistent
    one from the caller's point of view, which is the point (see
    docs/decisions and this feature's design brief on IDOR prevention).
    """


class TryOnNotFoundError(ValueError):
    """Raised when the try-on job doesn't exist for this user."""


class TryOnNotSaveableError(ValueError):
    """Raised when a try-on can't be saved (not finished, or its images are gone).
    The message is safe to show to the user."""


def _to_response(look: SavedLook) -> SavedLookResponse:
    return SavedLookResponse.model_validate(look)


async def create_saved_look(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    user_image: ImageUpload,
    clothing_image: ImageUpload,
    generated_image: ImageUpload,
) -> SavedLookResponse:
    # Validate all three before saving any — a bad third image should never
    # leave the first two orphaned on disk.
    extensions = [validate_image(image) for image in (user_image, clothing_image, generated_image)]

    storage = get_storage_service()
    user_image_url = storage.save(user_image.content, extensions[0])
    clothing_image_url = storage.save(clothing_image.content, extensions[1])
    generated_image_url = storage.save(generated_image.content, extensions[2])

    repo = SavedLookRepository(db)
    look = await repo.create(
        user_id=user_id,
        title=title,
        user_image_url=user_image_url,
        clothing_image_url=clothing_image_url,
        generated_image_url=generated_image_url,
    )
    logger.info("saved look created: id=%s user_id=%s", look.id, user_id)
    return _to_response(look)


async def create_saved_look_from_job(
    db: AsyncSession, user_id: UUID, payload: SaveLookFromJobRequest
) -> SavedLookResponse:
    """Saves a completed try-on to Looks. Idempotent: saving the same
    try-on twice returns the existing look.

    The three images are *copied*, not referenced: delete_saved_look()
    deletes a look's files, and sharing them would also delete the user's
    photo and the garment's image from their wardrobe."""
    looks = SavedLookRepository(db)
    existing = await looks.get_by_job_id_for_user(payload.job_id, user_id)
    if existing is not None:
        return _to_response(existing)

    job = await InferenceJobRepository(db).get_by_id_for_user(payload.job_id, user_id)
    if job is None:
        raise TryOnNotFoundError(f"No try-on {payload.job_id} for this user")
    if (
        job.status != InferenceJobStatus.COMPLETED
        or not job.generated_image_url
        or not job.user_image_storage_key
    ):
        raise TryOnNotSaveableError("This try-on isn't finished, so it can't be saved yet.")

    clothing = await resolve_job_clothing(db, job)
    if clothing is None:
        raise TryOnNotSaveableError("The clothing item for this try-on is no longer available.")

    storage = get_storage_service()

    def copy_all(paths: list[str]) -> list[str]:
        """Copies every file or none: a failure part-way removes the copies
        already made. Runs in a worker thread (blocking disk I/O)."""
        copies: list[str] = []
        try:
            for path in paths:
                extension = PurePosixPath(path).suffix.lstrip(".") or "png"
                copies.append(storage.save(storage.read(path), extension))
        except Exception:
            for copied in copies:
                storage.delete(copied)
            raise
        return copies

    try:
        user_image_url, clothing_image_url, generated_image_url = await asyncio.to_thread(
            copy_all, [job.user_image_storage_key, clothing.image_url, job.generated_image_url]
        )
    except FileNotFoundError as exc:
        raise TryOnNotSaveableError("The images for this try-on are no longer available.") from exc

    try:
        look = await looks.create(
            user_id=user_id,
            title=payload.title or clothing.title,
            user_image_url=user_image_url,
            clothing_image_url=clothing_image_url,
            generated_image_url=generated_image_url,
            inference_job_id=job.id,
        )
    except Exception as exc:
        await db.rollback()
        # Did a look for this try-on get saved anyway? Either a concurrent
        # request (double tap) saved it first (IntegrityError), or this
        # request's own insert committed and only a later step failed.
        existing = await looks.get_by_job_id_for_user(payload.job_id, user_id)
        mine = existing is not None and existing.generated_image_url == generated_image_url
        if not mine:
            # Our copies aren't referenced by any saved row: remove them.
            for path in (user_image_url, clothing_image_url, generated_image_url):
                storage.delete(path)
        if existing is not None and (mine or isinstance(exc, IntegrityError)):
            return _to_response(existing)
        raise
    logger.info("saved look created from job: id=%s job_id=%s", look.id, job.id)
    return _to_response(look)


async def list_saved_looks(db: AsyncSession, user_id: UUID) -> list[SavedLookResponse]:
    repo = SavedLookRepository(db)
    looks = await repo.list_for_user(user_id)
    return [_to_response(look) for look in looks]


async def update_saved_look(
    db: AsyncSession, user_id: UUID, look_id: UUID, payload: SavedLookUpdate
) -> SavedLookResponse:
    repo = SavedLookRepository(db)
    look = await repo.get_by_id_for_user(look_id, user_id)
    if look is None:
        raise SavedLookNotFoundError(f"No saved look {look_id} for this user")
    look = await repo.update(look, title=payload.title, is_favourite=payload.is_favourite)
    logger.info("saved look updated: id=%s user_id=%s", look.id, user_id)
    return _to_response(look)


async def delete_saved_look(db: AsyncSession, user_id: UUID, look_id: UUID) -> None:
    repo = SavedLookRepository(db)
    look = await repo.get_by_id_for_user(look_id, user_id)
    if look is None:
        raise SavedLookNotFoundError(f"No saved look {look_id} for this user")

    storage = get_storage_service()
    for url in (look.user_image_url, look.clothing_image_url, look.generated_image_url):
        storage.delete(url)

    await repo.delete(look)
    logger.info("saved look deleted: id=%s user_id=%s", look_id, user_id)
