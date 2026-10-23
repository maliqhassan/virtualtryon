from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    storage_key: str
    image_url: str
    angle: str
    # Plain-background version, when one could be made.
    cutout_url: str | None
    created_at: datetime
