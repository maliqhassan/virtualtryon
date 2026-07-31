"""Business logic for the UserPhoto feature. No FastAPI import here, same
layering rule as garments.py/saved_looks.py. Reuses image_validation.py and
storage/ unchanged — no duplicated upload/validation logic.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.user_photo_repository import UserPhotoRepository
from app.models.user_photo import UserPhoto
from app.schemas.user_photo import UserPhotoResponse
from app.services.image_validation import ImageUpload, validate_image
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


def _to_response(photo: UserPhoto) -> UserPhotoResponse:
    return UserPhotoResponse.model_validate(photo)


async def create_user_photo(
    db: AsyncSession, user_id: UUID, image: ImageUpload
) -> UserPhotoResponse:
    extension = validate_image(image)

    storage = get_storage_service()
    storage_key = storage.save(image.content, extension)

    repo = UserPhotoRepository(db)
    photo = await repo.create(user_id=user_id, storage_key=storage_key)
    logger.info("user photo created: id=%s user_id=%s", photo.id, user_id)
    return _to_response(photo)
