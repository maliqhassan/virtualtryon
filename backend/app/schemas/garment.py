from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class GarmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category: str
    color: str | None
    season: str | None
    image_url: str
    created_at: datetime
    updated_at: datetime


class GarmentUpdate(BaseModel):
    """PATCH body — all fields optional so a client can update any subset
    (rename, recategorise, etc.) in one call.
    """

    title: str | None = None
    category: str | None = None
    color: str | None = None
    season: str | None = None
