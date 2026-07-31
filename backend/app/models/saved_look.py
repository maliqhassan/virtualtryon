"""A user's saved try-on result: the three images involved (user photo,
garment photo, generated result), a title, a favourite flag, and when it
was created. Image fields store storage URLs/paths returned by
`app/services/storage/`, never a client-supplied file path directly.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SavedLook(Base):
    __tablename__ = "saved_looks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    user_image_url: Mapped[str] = mapped_column(nullable=False)
    clothing_image_url: Mapped[str] = mapped_column(nullable=False)
    generated_image_url: Mapped[str] = mapped_column(nullable=False)
    is_favourite: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
