from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SavedLookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    user_image_url: str
    clothing_image_url: str
    generated_image_url: str
    is_favourite: bool
    created_at: datetime


class SavedLookUpdate(BaseModel):
    """PATCH body — both fields optional so a client can update either or
    both (rename only, favourite-toggle only, or both at once).
    """

    title: str | None = None
    is_favourite: bool | None = None
