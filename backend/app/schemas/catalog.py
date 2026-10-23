from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
