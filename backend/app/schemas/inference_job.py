from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.inference_job import InferenceJobStatus


class InferenceJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    garment_id: UUID | None
    product_id: UUID | None
    profile_id: UUID | None
    user_image_storage_key: str
    generated_image_url: str | None
    status: InferenceJobStatus
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CreateInferenceJobRequest(BaseModel):
    """POST body: the clothing to try on, either a wardrobe garment or a store
    product (exactly one), and optionally which of the caller's model photos
    to use (`user_photo_id`; the newest when left out). The photo is looked
    up server-side among the caller's own, never a client-supplied storage
    key, so a request can't point a job at someone else's photo. `profile_id`
    isn't a field either; the service auto-attaches the caller's own Profile."""

    garment_id: UUID | None = None
    product_id: UUID | None = None
    user_photo_id: UUID | None = None

    @model_validator(mode="after")
    def exactly_one_clothing_source(self) -> "CreateInferenceJobRequest":
        if (self.garment_id is None) == (self.product_id is None):
            raise ValueError("Provide exactly one of garment_id or product_id.")
        return self
