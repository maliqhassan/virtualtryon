"""Email + password sign-in (ADR 0010). One call handles both cases, as the
design's single email screen does: an unknown email creates the account, a
known one signs in.

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
class EmailSignIn:
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
) -> EmailSignIn:
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
    is_guest = (
        current_user is not None
        and current_user.auth_provider == AuthProvider.GUEST
        and current_user.email is None
    )
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
    return EmailSignIn(user=user, token=create_session_token(user.id), created=True)


async def _sign_in(db: AsyncSession, user: User, email: str, password: str) -> EmailSignIn:
    stored = user.password_hash
    if stored is None or not await asyncio.to_thread(verify_password, stored, password):
        _failures_per_email.try_acquire(email)
        raise WrongPasswordError
    if password_needs_rehash(stored):
        user.password_hash = await asyncio.to_thread(hash_password, password)
        await db.commit()
    return EmailSignIn(user=user, token=create_session_token(user.id), created=False)
