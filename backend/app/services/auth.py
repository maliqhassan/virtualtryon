"""Sign-in: email + password (ADR 0010) and Google through Firebase (ADR
0012). Each is one call for both cases: an unknown person gets a new
account, a known one signs in.

Creating an account from a guest turns that guest's row into the account
(email, password hash, provider), so everything the guest already made
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

from app.core.security import (
    create_session_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from app.db.repositories.user_repository import UserRepository
from app.models.user import AuthProvider, User
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.firebase_identity import (
    IdentityVerifier,
    InvalidIdentityError,
    VerifiedIdentity,
)

logger = logging.getLogger(__name__)

ATTEMPT_WINDOW_SECONDS = 15 * 60
# Every attempt from one network address (sign-ups included), and every
# attempt overall: each one costs an argon2 hash, so both bound the work.
ATTEMPTS_PER_ADDRESS = 30
ATTEMPTS_ALL_CALLERS = 600
# Wrong passwords for one email. Only failures count, so a person signing
# in correctly is never locked out by their own successful sign-ins.
FAILURES_PER_EMAIL = 10

_per_address = SlidingWindowLimiter(ATTEMPTS_PER_ADDRESS, ATTEMPT_WINDOW_SECONDS)
_all_callers = SlidingWindowLimiter(ATTEMPTS_ALL_CALLERS, ATTEMPT_WINDOW_SECONDS)
_failures_per_email = SlidingWindowLimiter(FAILURES_PER_EMAIL, ATTEMPT_WINDOW_SECONDS)
_ALL = "all"


def reset_attempt_limits() -> None:
    """For tests."""
    _per_address.reset()
    _all_callers.reset()
    _failures_per_email.reset()


class WrongPasswordError(Exception):
    """The email has an account and this isn't its password."""


class TooManyAttemptsError(Exception):
    """Too many sign-in attempts from this address, overall, or for this email."""


@dataclass(frozen=True)
class SignInResult:
    user: User
    token: str
    created: bool


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def continue_with_email(
    db: AsyncSession,
    current_user: User | None,
    email: str,
    password: str,
    *,
    caller_address: str,
) -> SignInResult:
    """`current_user` is the caller's existing guest or account, or None.
    Raises WrongPasswordError or TooManyAttemptsError."""
    email = normalize_email(email)
    # Locked emails are checked first, so a refused attempt costs nothing
    # and doesn't use up the caller's own allowance.
    if _failures_per_email.is_exhausted(email):
        raise TooManyAttemptsError
    if not _per_address.try_acquire(caller_address) or not _all_callers.try_acquire(_ALL):
        raise TooManyAttemptsError

    repo = UserRepository(db)
    existing = await repo.get_by_email(email)
    if existing is not None:
        return await _sign_in(db, existing, email, password)

    password_hash = await asyncio.to_thread(hash_password, password)
    is_guest = _is_unclaimed_guest(current_user)
    if is_guest and current_user is not None:
        user = current_user
        user.email = email
        user.password_hash = password_hash
        user.auth_provider = AuthProvider.EMAIL
        user.device_id = None
    else:
        # No guest yet, or already signed in to another account: a new account.
        user = repo.stage_new_email_user(email, password_hash)
    try:
        await db.commit()
    except IntegrityError:
        # The same email was registered a moment ago (a double tap, or two
        # phones). Treat this attempt as a sign-in to that account.
        await db.rollback()
        existing = await repo.get_by_email(email)
        if existing is None:
            raise
        return await _sign_in(db, existing, email, password)
    await db.refresh(user)
    logger.info("account created: user_id=%s from_guest=%s", user.id, is_guest)
    return SignInResult(
        user=user, token=create_session_token(user.id, user.session_version), created=True
    )


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
    known = await repo.get_by_firebase_uid(identity.uid)
    if known is not None:
        return SignInResult(
            user=known, token=create_session_token(known.id, known.session_version), created=False
        )

    # Google has proven this address belongs to this person.
    email = normalize_email(identity.email) if identity.email and identity.email_verified else None
    same_email = await repo.get_by_email(email) if email else None
    if same_email is not None:
        user = _link_google(same_email, identity)
        created = False
    elif _is_unclaimed_guest(current_user) and current_user is not None:
        user = current_user
        user.firebase_uid = identity.uid
        user.email = email
        user.auth_provider = AuthProvider.GOOGLE
        user.device_id = None
        created = True
    else:
        user = repo.stage_new_google_user(identity.uid, email)
        created = True
    try:
        await db.commit()
    except IntegrityError:
        # The same Google account signed in a moment ago (a double tap).
        await db.rollback()
        known = await repo.get_by_firebase_uid(identity.uid)
        if known is None:
            raise
        return SignInResult(
            user=known, token=create_session_token(known.id, known.session_version), created=False
        )
    await db.refresh(user)
    if created:
        logger.info("google account created: user_id=%s", user.id)
    return SignInResult(
        user=user, token=create_session_token(user.id, user.session_version), created=created
    )


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


async def _sign_in(db: AsyncSession, user: User, email: str, password: str) -> SignInResult:
    stored = user.password_hash
    if stored is None or not await asyncio.to_thread(verify_password, stored, password):
        _failures_per_email.try_acquire(email)
        raise WrongPasswordError
    if password_needs_rehash(stored):
        user.password_hash = await asyncio.to_thread(hash_password, password)
        await db.commit()
    return SignInResult(
        user=user, token=create_session_token(user.id, user.session_version), created=False
    )
