"""Sign-in with Google through Firebase (ADR 0012), the app's only sign-in
(email + password, ADR 0010, was removed: ADR 0016). One call for both
cases: an unknown person gets a new account, a known one signs in.

Creating an account from a guest turns that guest's row into the account
(email, Google id, provider), so everything the guest already made
stays. The row's device id is cleared at the same time: from then on only
the session token reaches the account, and a phone that signs out starts a
fresh guest instead of landing back in it. A caller with no guest yet gets
a brand-new account row; no throwaway guest is created first.
"""

import asyncio
import logging
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_session_token
from app.db.repositories.guest_merge_repository import GuestMergeRepository
from app.db.repositories.user_repository import UserRepository
from app.models.user import AuthProvider, User
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.firebase_identity import (
    IdentityVerifier,
    InvalidIdentityError,
    VerifiedIdentity,
)
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)

ATTEMPT_WINDOW_SECONDS = 15 * 60
# Every attempt from one network address, and every attempt overall: each
# one checks a token against Google's keys, so both bound the work.
ATTEMPTS_PER_ADDRESS = 30
ATTEMPTS_ALL_CALLERS = 600

_per_address = SlidingWindowLimiter(ATTEMPTS_PER_ADDRESS, ATTEMPT_WINDOW_SECONDS)
_all_callers = SlidingWindowLimiter(ATTEMPTS_ALL_CALLERS, ATTEMPT_WINDOW_SECONDS)
_ALL = "all"


def reset_attempt_limits() -> None:
    """For tests."""
    _per_address.reset()
    _all_callers.reset()


class TooManyAttemptsError(Exception):
    """Too many sign-in attempts from this address, or overall."""


@dataclass(frozen=True)
class SignInResult:
    user: User
    token: str
    created: bool


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_unclaimed_guest(user: User | None) -> bool:
    return user is not None and user.auth_provider == AuthProvider.GUEST and user.email is None


# Only Google is switched on in the app for now; other Firebase methods
# (Apple, phone) are refused until they're deliberately added.
_ALLOWED_PROVIDERS = {"google.com"}


async def continue_with_google(
    db: AsyncSession,
    current_user: User | None,
    id_token: str,
    verifier: IdentityVerifier,
    *,
    caller_address: str,
) -> SignInResult:
    """`id_token` is the Firebase token the app got from Google sign-in.
    Raises InvalidIdentityError, IdentityUnavailableError or TooManyAttemptsError."""
    if not _per_address.try_acquire(caller_address) or not _all_callers.try_acquire(_ALL):
        raise TooManyAttemptsError
    identity = await verifier.verify(id_token)
    if identity.provider not in _ALLOWED_PROVIDERS:
        raise InvalidIdentityError

    repo = UserRepository(db)
    guest = current_user if _is_unclaimed_guest(current_user) else None
    known = await repo.get_by_firebase_uid(identity.uid)
    # Google has proven this address belongs to this person.
    email = normalize_email(identity.email) if identity.email and identity.email_verified else None
    same_email = await repo.get_by_email(email) if known is None and email is not None else None
    if known is not None:
        user = known
        created = False
    elif same_email is not None:
        user = _link_google(same_email, identity)
        created = False
    elif guest is not None:
        user = guest
        user.firebase_uid = identity.uid
        user.email = email
        user.auth_provider = AuthProvider.GOOGLE
        user.device_id = None
        created = True
    else:
        user = repo.stage_new_google_user(identity.uid, email)
        created = True

    # Signing in to an account they already had: what they made as a guest
    # on this phone (pieces, photos, try-ons, looks) moves into it (ADR 0014).
    merged_guest = None
    superseded_files: list[str] = []
    if not created and guest is not None and guest.id != user.id:
        # Both rows locked, in a fixed order: no try-on can start on either
        # while things move, so the account's allowance check sees them all.
        for user_id in sorted((guest.id, user.id)):
            await repo.get_for_update(user_id)
        superseded_files = await GuestMergeRepository(db).move_everything(guest, user.id)
        merged_guest = guest.id
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        if merged_guest is not None:
            # Not a double tap: the move itself failed. Say so rather than
            # sign in without the guest's things.
            logger.exception("guest merge failed: guest=%s user_id=%s", merged_guest, user.id)
            raise
        # The same Google account signed in a moment ago (a double tap).
        known = await repo.get_by_firebase_uid(identity.uid)
        if known is None:
            raise
        return SignInResult(
            user=known,
            token=create_session_token(known.id, known.session_version),
            created=False,
        )
    await db.refresh(user)
    if created:
        logger.info("google account created: user_id=%s", user.id)
    if merged_guest is not None:
        logger.info("guest merged into account: guest=%s user_id=%s", merged_guest, user.id)
        await asyncio.to_thread(_delete_files, superseded_files)
    return SignInResult(
        user=user,
        token=create_session_token(user.id, user.session_version),
        created=created,
    )


def _delete_files(paths: list[str]) -> None:
    """Photos replaced by a newer one of the same view, after the merge
    committed. A leftover file isn't worth failing the sign-in over."""
    storage = get_storage_service()
    for path in paths:
        try:
            storage.delete(path)
        except Exception:
            logger.exception("could not delete a superseded photo file")


def _link_google(user: User, identity: VerifiedIdentity) -> User:
    """An account already uses this email (registered with a password,
    which never proved ownership of the address). Google just did, so the
    account becomes this person's Google account and the password is
    removed. Bumping the session version also ends every session issued
    before, so whoever set that password is signed out everywhere."""
    user.firebase_uid = identity.uid
    user.password_hash = None
    user.auth_provider = AuthProvider.GOOGLE
    user.session_version += 1
    logger.info("email account linked to google: user_id=%s", user.id)
    return user
