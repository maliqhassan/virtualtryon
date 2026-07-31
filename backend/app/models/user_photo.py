"""A guest's uploaded photo of themselves, used as an InferenceJob's real
`user_image_storage_key` — replaces the frontend's mock storage-key
placeholder (Sprint 4 Stage 2/3) with a real, backend-stored file.
Deliberately minimal, matching Profile's precedent for building only what
was asked: no rename/list/delete operations exist for this resource
(nothing requested them), unlike Garment/SavedLook's fuller CRUD surface.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPhoto(Base):
    __tablename__ = "user_photos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    @property
    def image_url(self) -> str:
        """Same underlying value as `storage_key` — StorageService.save()'s
        return value (e.g. "/uploads/<uuid>.png") is both "the reference an
        InferenceJob stores" and "the path a client renders the photo
        from," matching Garment/SavedLook's `image_url` naming for the
        latter. One stored column, two named views for two different
        consumers — not duplicated data, and not a second DB column to
        keep in sync.
        """
        return self.storage_key
