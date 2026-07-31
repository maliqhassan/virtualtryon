"""First real domain model in this backend.

Implements `docs/roadmap/README.md`'s guest-identity cross-cutting
decision: a guest is a `User` row with no credentials attached
(`auth_provider="guest"`, `device_id` set) rather than a separate throwaway
anonymous-session table. Authentication (Milestone 6) becomes "attach
credentials to an existing row," not "migrate data between tables" — which
is why `auth_provider` already models all four eventual values, not just
the one this feature uses.
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuthProvider(enum.StrEnum):
    GUEST = "guest"
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    auth_provider: Mapped[AuthProvider] = mapped_column(SAEnum(AuthProvider), nullable=False)
    # Server-generated, unguessable (see app/services/guest_identity.py) — never
    # client-chosen, since that would let one guest impersonate another's rows.
    device_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
