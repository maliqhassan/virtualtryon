"""A guest's AI try-on generation job — persisted lifecycle state, per
docs/decisions/0008-inference-job-persistence.md. Deliberately named and
vocabularied apart from `backend/ai/models/job.py`'s in-memory `TryOnJob`/
`WorkflowStage` (that module's own docstring for the full reasoning): this
is the guest-facing record a job exists as, not the future worker's
internal per-stage execution contract.

No inference happens anywhere in this module or its service/repository —
`status` only ever moves via `app/services/inference_jobs.py`'s
`mark_processing`/`mark_completed`/`mark_failed`, callable by a future
worker, never by an HTTP endpoint (no public PATCH/DELETE exists for this
resource).
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InferenceJobStatus(enum.StrEnum):
    """A genuinely closed, stable set (unlike Garment.category's
    open-string taxonomy) — matches User.auth_provider's precedent: a real
    Postgres enum, not a plain string."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class InferenceJob(Base):
    __tablename__ = "inference_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    # Nullable + ON DELETE SET NULL: a job stays as history if its garment
    # is later deleted from Wardrobe, rather than cascading its deletion.
    garment_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("garments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # A try-on uses either a wardrobe garment or a store product, never both.
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    # Backend-controlled storage reference (app/services/storage/'s own
    # save/read/delete vocabulary), never a client-supplied URL — the one
    # change from this feature's original design brief. "storage_key"
    # rather than "path" to read naturally once a future S3-compatible
    # StorageService implementation exists (docs/roadmap/README.md's
    # storage cross-cutting decision #3) — S3 objects are addressed by
    # key, not path.
    user_image_storage_key: Mapped[str] = mapped_column(nullable=False)
    # Never client-supplied either (only ever set by the service-layer
    # mark_completed() a future worker calls) — kept as *_url, matching
    # Garment/SavedLook's own image_url precedent, since the "arbitrary
    # client input" concern this feature's one change addressed doesn't
    # apply to a field nothing external ever writes.
    generated_image_url: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[InferenceJobStatus] = mapped_column(
        SAEnum(InferenceJobStatus), nullable=False, default=InferenceJobStatus.QUEUED
    )
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
