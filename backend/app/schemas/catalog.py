from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# The Try-On studio's filters. Fixed lists: anything else is a 422.
AudienceFilter = Literal["men", "women"]
OccasionFilter = Literal["casual", "dresses", "office", "wedding"]


class StoreResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    tagline: str
    accent_color: str
    product_count: int


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    store_id: UUID
    store_name: str
    title: str
    category: str
    price_cents: int
    currency: str
    image_url: str
    product_url: str | None
    # "men", "women" or "unisex", and occasion tags (casual, dresses,
    # office, wedding) for the Try-On studio's filters.
    audience: str = "unisex"
    occasions: list[str] = []
