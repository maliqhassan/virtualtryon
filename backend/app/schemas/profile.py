from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    display_name: str | None
    age: int | None
    gender: str | None
    height_cm: int
    weight_kg: float
    body_type: str | None
    preferred_fit: str | None
    created_at: datetime
    updated_at: datetime


class CreateProfileRequest(BaseModel):
    """POST body. height_cm/weight_kg are required (Sprint 3's one
    modification to the original brief) — every other field is optional,
    matching the model's own nullability.
    """

    display_name: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    height_cm: int = Field(ge=80, le=250)
    weight_kg: float = Field(ge=20, le=300)
    body_type: str | None = None
    preferred_fit: str | None = None


class UpdateProfileRequest(BaseModel):
    """PATCH body — all fields optional so a client can update any subset,
    matching GarmentUpdate's pattern. height_cm/weight_kg are only required
    at *creation*; once a profile exists, PATCH doesn't need to resupply
    them to touch other fields.
    """

    display_name: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    height_cm: int | None = Field(default=None, ge=80, le=250)
    weight_kg: float | None = Field(default=None, ge=20, le=300)
    body_type: str | None = None
    preferred_fit: str | None = None
