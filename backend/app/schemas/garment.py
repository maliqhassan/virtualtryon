from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GarmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category: str
    color: str | None
    season: str | None
    image_url: str
    source_url: str | None
    source_store: str | None
    created_at: datetime
    updated_at: datetime


class CategoryGuessResponse(BaseModel):
    """POST /garments/detect-category: null when the photo couldn't be read
    (or detection is off), so the user chooses as before."""

    model_config = ConfigDict(from_attributes=True)

    category: str | None
    confidence: float | None


class GarmentFromLinkRequest(BaseModel):
    """POST /garments/from-link body: a product page link from any store."""

    url: str = Field(min_length=1, max_length=2048)


class GarmentUpdate(BaseModel):
    """PATCH body — all fields optional so a client can update any subset
    (rename, recategorise, etc.) in one call.
    """

    title: str | None = None
    category: str | None = None
    color: str | None = None
    season: str | None = None
