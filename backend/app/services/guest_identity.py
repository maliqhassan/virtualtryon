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
from app.services.attempt_limiter import SlidingWindowLimiter

DEVICE_ID_HEADER = "X-Device-Id"

# Any request without a device id creates a guest row, so new guests are
# limited per network address, and overall as a backstop against many
# addresses. A real phone needs one guest per install; several people behind
# one mobile-carrier address stay far under the per-address limit.
NEW_GUESTS_PER_ADDRESS_PER_HOUR = 30
NEW_GUESTS_ALL_ADDRESSES_PER_HOUR = 600

_per_address = SlidingWindowLimiter(NEW_GUESTS_PER_ADDRESS_PER_HOUR, window_seconds=3600)
_all_addresses = SlidingWindowLimiter(NEW_GUESTS_ALL_ADDRESSES_PER_HOUR, window_seconds=3600)


class GuestLimitError(Exception):
    pass


def generate_device_id() -> str:
    return secrets.token_urlsafe(32)


def _allow_new_guest(caller_address: str) -> bool:
    # A full overall allowance refuses without charging the address. Then the
    # per-address check runs first, so one noisy address can't use up the
    # overall allowance for everyone else.
    if _all_addresses.is_exhausted("all"):
        return False
    return _per_address.try_acquire(caller_address) and _all_addresses.try_acquire("all")


async def resolve_or_create_guest(
    repo: UserRepository, presented_device_id: str | None, caller_address: str
) -> tuple[User, str | None]:
    """Returns (user, new_device_id). `new_device_id` is non-None only when
    a fresh id was issued — the caller (app/api/deps.py) uses that to set
    the response header so the client can store and resend it. Raises
    GuestLimitError when `caller_address` made too many guests recently.
    """
    if presented_device_id:
        existing = await repo.get_by_device_id(presented_device_id)
        if existing is not None:
            return existing, None

    if not _allow_new_guest(caller_address):
        raise GuestLimitError("Too many new guests from this address")
    new_device_id = generate_device_id()
    user = await repo.create_guest(new_device_id)
    return user, new_device_id


def reset_guest_limits() -> None:
    """For tests."""
    _per_address.reset()
    _all_addresses.reset()
