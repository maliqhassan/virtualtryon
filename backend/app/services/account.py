"""Account-level operations. "Delete all my data" removes everything
personal a user has stored: saved looks, wardrobe, photos, profile, and
every image file behind them.

Try-on job rows are kept with their image references cleared. They hold no
personal data once redacted, and they're what usage.py counts, so
deleting your data can't be used to get another free try-on. The User row
itself stays too (it's the anonymous guest identity the app keeps using).
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.profile_repository import ProfileRepository
from app.db.repositories.saved_look_repository import SavedLookRepository
from app.db.repositories.user_photo_repository import UserPhotoRepository, photo_files
from app.services.inference_jobs import stage_redact_tryon_images
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


async def delete_all_user_data(db: AsyncSession, user_id: UUID) -> None:
    """All database changes go in one transaction; files are deleted only
    after it commits. A failure part-way therefore leaves everything as it
    was (and the user can retry), never rows pointing at deleted files."""
    paths: list[str] = []

    looks = SavedLookRepository(db)
    for look in await looks.list_for_user(user_id):
        paths += [look.user_image_url, look.clothing_image_url, look.generated_image_url]
    await looks.stage_delete_all_for_user(user_id)

    garments = GarmentRepository(db)
    paths += [garment.image_url for garment in await garments.list_for_user(user_id)]
    await garments.stage_delete_all_for_user(user_id)

    photos = UserPhotoRepository(db)
    paths += [path for photo in await photos.list_for_user(user_id) for path in photo_files(photo)]
    await photos.stage_delete_all_for_user(user_id)

    paths += await stage_redact_tryon_images(db, user_id)
    await ProfileRepository(db).stage_delete_for_user(user_id)

    await db.commit()

    storage = get_storage_service()
    for path in paths:
        storage.delete(path)
    logger.info("all user data deleted: user_id=%s files=%d", user_id, len(paths))
