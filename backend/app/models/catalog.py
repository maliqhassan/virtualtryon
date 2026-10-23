"""The store catalogue: stores and the clothes they sell, which any user can
browse and try on before buying.

Shared by everyone (no user_id): it's read-only to the app. For now it holds a
sample catalogue created by `python -m app.seed_catalog`; real stores will
connect their own product feeds later (docs/roadmap Milestone 9 deliberately
starts with a seeded catalogue, not a live retailer integration).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    tagline: Mapped[str] = mapped_column(String(200), nullable=False)
    # Hex colour for the store's badge in the app (e.g. "#B4713F").
    accent_color: Mapped[str] = mapped_column(String(9), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    image_url: Mapped[str] = mapped_column(nullable=False)
    # Where to buy it on the store's own site; null for sample products.
    product_url: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
