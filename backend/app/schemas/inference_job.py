from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.inference_job import InferenceJobStatus


class InferenceJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    garment_id: UUID | None
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
    """POST body. `profile_id` is deliberately not a field here — the
    service auto-attaches the caller's own Profile if one exists, rather
    than trusting a client-supplied profile reference (there would be no
    reason for a client to ever need to choose a *different* profile than
    its own)."""

    garment_id: UUID
    user_image_storage_key: str = Field(min_length=1)

    @field_validator("user_image_storage_key")
    @classmethod
    def reject_external_urls(cls, value: str) -> str:
        """The one change from this feature's original design: this must
        be a backend-controlled storage reference, never an arbitrary
        client-supplied URL. "://" is what every scheme (http://, https://,
        even file://) shares — rejecting it is a cheap, real enforcement
        of that rule, not just a naming convention."""
        if "://" in value:
            raise ValueError("must be a backend storage reference, not an external URL")
        return value
