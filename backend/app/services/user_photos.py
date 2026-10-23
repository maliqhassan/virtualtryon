"""Business logic for the user's own photo ("My Photo"). No FastAPI import
here, same layering rule as garments.py/saved_looks.py. Reuses
image_validation.py and storage/ unchanged — no duplicated upload/validation
logic.

A user uploads their full-body photo once and it's reused for every try-on.
Besides the front photo (used for try-ons), the user can add a side and a
back view. Uploading a view replaces (and deletes) its previous photo. Each
photo also gets a plain-background cut-out when one can be made.
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.user_photo_repository import UserPhotoRepository, photo_files
from app.models.user_photo import UserPhoto
from app.schemas.user_photo import UserPhotoResponse
from app.services.image_validation import ImageUpload, validate_image
from app.services.inference_jobs import stage_redact_tryon_images
from app.services.photo_background import BackgroundRemover
from app.services.photo_quality import FullBodyChecker
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


def _to_response(photo: UserPhoto) -> UserPhotoResponse:
    return UserPhotoResponse.model_validate(photo)


PHOTO_ANGLES = ("front", "side", "back")


class InvalidPhotoAngleError(ValueError):
    pass


async def create_user_photo(
    db: AsyncSession,
    user_id: UUID,
    image: ImageUpload,
    body_checker: FullBodyChecker,
    background_remover: BackgroundRemover,
    angle: str = "front",
) -> UserPhotoResponse:
    if angle not in PHOTO_ANGLES:
        raise InvalidPhotoAngleError(f"angle must be one of {', '.join(PHOTO_ANGLES)}")
    extension = validate_image(image)
    # MediaPipe work is CPU-bound and synchronous; run it off the event loop
    # so one upload doesn't stall every other request. The full-body check
    # applies to the front photo, the one every try-on uses.
    if angle == "front":
        await asyncio.to_thread(body_checker.check, image.content)
    cutout = await asyncio.to_thread(background_remover.remove, image.content)

    storage = get_storage_service()
    storage_key = storage.save(image.content, extension)
    cutout_key = storage.save(cutout, "png") if cutout else None

    repo = UserPhotoRepository(db)
    photo = await repo.create(
        user_id=user_id, storage_key=storage_key, angle=angle, cutout_storage_key=cutout_key
    )
    # One photo per view: replacing it removes the old one (and its cut-out),
    # so no body photo stays on the server after the user has replaced it.
    for old_path in await repo.delete_others_with_angle(user_id, keep_id=photo.id, angle=angle):
        storage.delete(old_path)
    logger.info("user photo created: id=%s user_id=%s angle=%s", photo.id, user_id, angle)
    return _to_response(photo)


async def get_current_user_photo(
    db: AsyncSession, user_id: UUID, angle: str = "front"
) -> UserPhotoResponse | None:
    photo = await UserPhotoRepository(db).get_latest_for_user(user_id, angle)
    return _to_response(photo) if photo is not None else None


async def list_current_user_photos(db: AsyncSession, user_id: UUID) -> list[UserPhotoResponse]:
    """The current photo for each view the user has added (front first)."""
    repo = UserPhotoRepository(db)
    photos = [await repo.get_latest_for_user(user_id, angle) for angle in PHOTO_ANGLES]
    return [_to_response(photo) for photo in photos if photo is not None]


async def delete_user_photos(db: AsyncSession, user_id: UUID) -> None:
    """Deletes the user's photo and every copy of it: the per-try-on copies
    and the try-on result images (they show the user's body too). Saved
    Looks are kept; those the user chose to keep, and "Delete all my data"
    removes them. Database first, in one commit; files after."""
    repo = UserPhotoRepository(db)
    paths = [path for photo in await repo.list_for_user(user_id) for path in photo_files(photo)]
    await repo.stage_delete_all_for_user(user_id)
    paths += await stage_redact_tryon_images(db, user_id)
    await db.commit()

    storage = get_storage_service()
    for path in paths:
        storage.delete(path)
    logger.info("user photos deleted: user_id=%s files=%d", user_id, len(paths))
