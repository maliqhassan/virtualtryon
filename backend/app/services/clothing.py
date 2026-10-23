"""Finds the clothing a try-on job uses: a wardrobe garment or a store
product. Shared by the worker and by "save to Looks" so both treat the two
sources the same way."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repository import CatalogRepository
from app.db.repositories.garment_repository import GarmentRepository
from app.models.inference_job import InferenceJob


@dataclass(frozen=True)
class JobClothing:
    image_url: str
    title: str


async def resolve_job_clothing(db: AsyncSession, job: InferenceJob) -> JobClothing | None:
    """None when the garment was deleted or the product was removed. Callers
    must already have checked the job belongs to whoever is asking."""
    if job.garment_id is not None:
        garment = await GarmentRepository(db).get_by_id(job.garment_id)
        return JobClothing(garment.image_url, garment.title) if garment is not None else None
    if job.product_id is not None:
        row = await CatalogRepository(db).get_product(job.product_id)
        return JobClothing(row[0].image_url, row[0].title) if row is not None else None
    return None
