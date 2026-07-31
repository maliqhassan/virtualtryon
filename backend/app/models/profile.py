"""A guest's physical measurements — used for virtual try-on fit/sizing
accuracy. Deliberately a separate concept from the future `StyleProfile`
(docs/roadmap/phase-b-platform.md Milestone 8 — aesthetic preferences: face
shape, skin tone, palette, for outfit recommendations). Different purpose,
different consumer; not to be merged into one model.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # unique=True enforces "one profile per guest" at the DB level, not just
    # in the service layer's existence check.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Required at creation (CreateProfileRequest) and therefore never absent
    # for any row that exists — NOT NULL reflects that invariant at the
    # strongest layer, same defense-in-depth convention as Garment's
    # title/category.
    height_cm: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    body_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    preferred_fit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
