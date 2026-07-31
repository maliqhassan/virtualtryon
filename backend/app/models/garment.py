"""A guest's wardrobe item. Foundational model for
docs/roadmap/phase-b-platform.md's Milestone 7 (Wardrobe) to extend later,
not a parallel structure — per CLAUDE.md's own guidance on this exact
pattern. Deliberately minimal for now: no wear-count/tags/laundry-status,
matching this project's established "don't build for scale the current
milestone doesn't need" discipline.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Garment(Base):
    __tablename__ = "garments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    season: Mapped[str | None] = mapped_column(String(50), nullable=True)
    image_url: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
