"""Business logic for the Wardrobe (Garment) feature. No FastAPI import
here — same layering rule as saved_looks.py. The endpoint layer reads the
UploadFile into an ImageUpload before calling in, and translates whatever
this raises into an HTTP status code.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.garment_repository import GarmentRepository
from app.models.garment import Garment
from app.schemas.garment import GarmentResponse, GarmentUpdate
from app.services.image_validation import ImageUpload, validate_image
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


class GarmentNotFoundError(ValueError):
    """Raised when a garment_id doesn't exist *for the resolved user* — a
    garment belonging to a different guest looks identical to a
    nonexistent one from the caller's point of view (IDOR prevention, same
    pattern as SavedLookNotFoundError).
    """


def _to_response(garment: Garment) -> GarmentResponse:
    return GarmentResponse.model_validate(garment)


async def create_garment(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    category: str,
    color: str | None,
    season: str | None,
    image: ImageUpload,
) -> GarmentResponse:
    extension = validate_image(image)

    storage = get_storage_service()
    image_url = storage.save(image.content, extension)

    repo = GarmentRepository(db)
    garment = await repo.create(
        user_id=user_id,
        title=title,
        category=category,
        color=color,
        season=season,
        image_url=image_url,
    )
    logger.info("garment created: id=%s user_id=%s", garment.id, user_id)
    return _to_response(garment)


async def list_garments(db: AsyncSession, user_id: UUID) -> list[GarmentResponse]:
    repo = GarmentRepository(db)
    garments = await repo.list_for_user(user_id)
    return [_to_response(garment) for garment in garments]


async def update_garment(
    db: AsyncSession, user_id: UUID, garment_id: UUID, payload: GarmentUpdate
) -> GarmentResponse:
    repo = GarmentRepository(db)
    garment = await repo.get_by_id_for_user(garment_id, user_id)
    if garment is None:
        raise GarmentNotFoundError(f"No garment {garment_id} for this user")
    garment = await repo.update(
        garment,
        title=payload.title,
        category=payload.category,
        color=payload.color,
        season=payload.season,
    )
    logger.info("garment updated: id=%s user_id=%s", garment.id, user_id)
    return _to_response(garment)


async def delete_garment(db: AsyncSession, user_id: UUID, garment_id: UUID) -> None:
    repo = GarmentRepository(db)
    garment = await repo.get_by_id_for_user(garment_id, user_id)
    if garment is None:
        raise GarmentNotFoundError(f"No garment {garment_id} for this user")

    storage = get_storage_service()
    storage.delete(garment.image_url)

    await repo.delete(garment)
    logger.info("garment deleted: id=%s user_id=%s", garment_id, user_id)
