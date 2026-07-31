"""Minimal guest identity: resolves the caller's User row from a device id,
or issues a brand-new one. Implements docs/roadmap/README.md's
guest-identity decision and the security correction from this feature's
design brief — device ids are always server-generated
(`secrets.token_urlsafe`), never accepted as a client-chosen value, since a
client-chosen id would let one guest simply claim another's rows.

This is the one seam that changes when real authentication (Milestone 6)
lands: `resolve_or_create_guest` gets replaced by something that decodes a
real auth token instead of a device id header. app/api/deps.py's
`get_current_user` — and therefore every SavedLook endpoint — doesn't
change at all.
"""

import secrets

from app.db.repositories.user_repository import UserRepository
from app.models.user import User

DEVICE_ID_HEADER = "X-Device-Id"


def generate_device_id() -> str:
    return secrets.token_urlsafe(32)


async def resolve_or_create_guest(
    repo: UserRepository, presented_device_id: str | None
) -> tuple[User, str | None]:
    """Returns (user, new_device_id). `new_device_id` is non-None only when
    a fresh id was issued — the caller (app/api/deps.py) uses that to set
    the response header so the client can store and resend it.
    """
    if presented_device_id:
        existing = await repo.get_by_device_id(presented_device_id)
        if existing is not None:
            return existing, None

    new_device_id = generate_device_id()
    user = await repo.create_guest(new_device_id)
    return user, new_device_id
