from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SavedLookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    user_image_url: str
    clothing_image_url: str
    generated_image_url: str
    is_favourite: bool
    inference_job_id: UUID | None
    created_at: datetime


class SaveLookFromJobRequest(BaseModel):
    """Save a completed try-on to Looks. `title` defaults to the garment's title."""

    job_id: UUID
    title: str | None = Field(default=None, min_length=1, max_length=200)


class SavedLookUpdate(BaseModel):
    """PATCH body — both fields optional so a client can update either or
    both (rename only, favourite-toggle only, or both at once).
    """

    title: str | None = None
    is_favourite: bool | None = None
