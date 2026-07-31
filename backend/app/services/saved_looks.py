"""Business logic for the Saved Looks feature. No FastAPI import here —
this repo's layering rule (app/api/ calls app/services/; services stay
framework-agnostic). The endpoint layer reads each UploadFile into an
ImageUpload before calling in, and translates whatever this raises into an
HTTP status code.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.saved_look_repository import SavedLookRepository
from app.models.saved_look import SavedLook
from app.schemas.saved_look import SavedLookResponse, SavedLookUpdate
from app.services.image_validation import ImageUpload, validate_image
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


class SavedLookNotFoundError(ValueError):
    """Raised when a look_id doesn't exist *for the resolved user* — a
    look belonging to a different guest looks identical to a nonexistent
    one from the caller's point of view, which is the point (see
    docs/decisions and this feature's design brief on IDOR prevention).
    """


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
