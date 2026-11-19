"""Business logic for the user's model photos ("My photos"). No FastAPI
import here, same layering rule as garments.py/saved_looks.py. Reuses
image_validation.py and storage/ unchanged.

A user keeps up to MAX_PHOTOS_PER_USER photos of themselves and picks which one
each try-on uses (the newest when they don't pick). Adding a photo never
replaces another; each can be deleted on its own. Every photo passes the
full-body check, since any of them can be used for a try-on, and gets a
plain-background cut-out when one can be made.

`angle` is kept for older app versions that still send front/side/back; it
no longer changes what's kept.
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.user_photo_repository import UserPhotoRepository, photo_files
from app.db.repositories.user_repository import UserRepository
from app.models.user_photo import MAX_PHOTOS_PER_USER, UserPhoto
from app.schemas.user_photo import UserPhotoResponse
from app.services.image_validation import ImageUpload, validate_image
from app.services.inference_jobs import stage_redact_tryon_images
from app.services.photo_background import BackgroundRemover
from app.services.photo_quality import FullBodyChecker
from app.services.storage import get_storage_service, save_together
from app.services.upload_limits import ensure_upload_allowed

logger = logging.getLogger(__name__)

PHOTO_ANGLES = ("front", "side", "back")


class InvalidPhotoAngleError(ValueError):
    pass


class TooManyPhotosError(Exception):
    pass


class UserPhotoNotFoundError(Exception):
    pass


def _to_response(photo: UserPhoto) -> UserPhotoResponse:
    return UserPhotoResponse.model_validate(photo)


async def create_user_photo(
    db: AsyncSession,
    user_id: UUID,
    image: ImageUpload,
    body_checker: FullBodyChecker,
    background_remover: BackgroundRemover,
    angle: str = "front",
) -> UserPhotoResponse:
    """Raises UnsupportedImageError, PhotoRejectedError, InvalidPhotoAngleError
    or TooManyPhotosError."""
    if angle not in PHOTO_ANGLES:
        raise InvalidPhotoAngleError(f"angle must be one of {', '.join(PHOTO_ANGLES)}")
    extension = validate_image(image)
    repo = UserPhotoRepository(db)
    # Checked before the slow work too, so a full set fails fast.
    if await repo.count_for_user(user_id) >= MAX_PHOTOS_PER_USER:
        raise TooManyPhotosError(_too_many())
    # MediaPipe work is CPU-bound and synchronous; run it off the event loop
    # so one upload doesn't stall every other request.
    await asyncio.to_thread(body_checker.check, image.content)
    # Counted only once the photo is accepted, so retaking a rejected photo
    # doesn't use up the day's uploads.
    ensure_upload_allowed(user_id)
    cutout = await asyncio.to_thread(background_remover.remove, image.content)

    # The user row is locked while counting and adding, so two uploads at
    # once can't both squeeze in as the tenth photo.
    await UserRepository(db).get_for_update(user_id)
    if await repo.count_for_user(user_id) >= MAX_PHOTOS_PER_USER:
        await db.rollback()
        raise TooManyPhotosError(_too_many())
    storage = get_storage_service()
    files = [(image.content, extension)] + ([(cutout, "png")] if cutout else [])
    storage_key, *rest = await asyncio.to_thread(save_together, storage, files)
    photo = await repo.create(
        user_id=user_id,
        storage_key=storage_key,
        angle=angle,
        cutout_storage_key=rest[0] if rest else None,
    )
    logger.info("user photo created: id=%s user_id=%s", photo.id, user_id)
    return _to_response(photo)


def _too_many() -> str:
    return (
        f"You can keep up to {MAX_PHOTOS_PER_USER} photos of yourself. Delete one to add another."
    )


async def get_current_user_photo(db: AsyncSession, user_id: UUID) -> UserPhotoResponse | None:
    """The newest photo: what a try-on uses when the app doesn't pick one."""
    photo = await UserPhotoRepository(db).get_latest_for_user(user_id)
    return _to_response(photo) if photo is not None else None


async def list_user_photos(db: AsyncSession, user_id: UUID) -> list[UserPhotoResponse]:
    """All of the user's model photos, newest first."""
    return [_to_response(photo) for photo in await UserPhotoRepository(db).list_for_user(user_id)]


async def delete_user_photo(db: AsyncSession, user_id: UUID, photo_id: UUID) -> None:
    """Deletes one model photo and its files (the photo and its cut-out).
    Try-ons already made keep their own copy until the user deletes all
    their photos or their data. Raises UserPhotoNotFoundError."""
    # Locked like try-on creation, so a try-on starting on this photo
    # finishes copying it before the file goes.
    await UserRepository(db).get_for_update(user_id)
    repo = UserPhotoRepository(db)
    photo = await repo.get_by_id_for_user(photo_id, user_id)
    if photo is None:
        await db.rollback()
        raise UserPhotoNotFoundError("That photo isn't there any more.")
    paths = await repo.delete(photo)
    storage = get_storage_service()
    for path in paths:
        storage.delete(path)
    logger.info("user photo deleted: id=%s user_id=%s", photo_id, user_id)


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
