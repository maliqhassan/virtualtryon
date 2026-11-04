"""Email + password sign-in (ADR 0010). One call handles both cases, as the
design's single email screen does: an unknown email creates the account, a
known one signs in.

Creating an account from a guest turns that guest's row into the account
(email, password hash, provider), so everything the guest already made
stays. The row's device id is cleared at the same time: from then on only
the session token reaches the account, and a phone that signs out starts a
fresh guest instead of landing back in it.
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

# Guessing a password is limited per email address (the target) and per
# caller; both count every attempt, right or wrong, before any hashing.
ATTEMPTS_PER_EMAIL = 10
ATTEMPTS_PER_CALLER = 30
ATTEMPT_WINDOW_SECONDS = 15 * 60

_per_email = SlidingWindowLimiter(ATTEMPTS_PER_EMAIL, ATTEMPT_WINDOW_SECONDS)
_per_caller = SlidingWindowLimiter(ATTEMPTS_PER_CALLER, ATTEMPT_WINDOW_SECONDS)


def reset_attempt_limits() -> None:
    """For tests."""
    _per_email.reset()
    _per_caller.reset()


class WrongPasswordError(Exception):
    """The email has an account and this isn't its password."""


class TooManyAttemptsError(Exception):
    """Too many sign-in attempts for this email or from this caller."""


@dataclass(frozen=True)
class EmailSignIn:
    user: User
    token: str
    created: bool


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def continue_with_email(
    db: AsyncSession, current_user: User, email: str, password: str
) -> EmailSignIn:
    """Raises WrongPasswordError or TooManyAttemptsError."""
    email = normalize_email(email)
    if not (_per_email.try_acquire(email) and _per_caller.try_acquire(str(current_user.id))):
        raise TooManyAttemptsError

    repo = UserRepository(db)
    existing = await repo.get_by_email(email)
    if existing is not None:
        return await _sign_in(db, existing, password)

    password_hash = await asyncio.to_thread(hash_password, password)
    is_guest = current_user.auth_provider == AuthProvider.GUEST and current_user.email is None
    if is_guest:
        user = current_user
        user.email = email
        user.password_hash = password_hash
        user.auth_provider = AuthProvider.EMAIL
        user.device_id = None
    else:
        # Already signed in to another account on this phone: a new account.
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
        return await _sign_in(db, existing, password)
    await db.refresh(user)
    logger.info("account created: user_id=%s from_guest=%s", user.id, is_guest)
    return EmailSignIn(user=user, token=create_session_token(user.id), created=True)


async def _sign_in(db: AsyncSession, user: User, password: str) -> EmailSignIn:
    stored = user.password_hash
    if stored is None or not await asyncio.to_thread(verify_password, stored, password):
        raise WrongPasswordError
    if password_needs_rehash(stored):
        user.password_hash = await asyncio.to_thread(hash_password, password)
        await db.commit()
    return EmailSignIn(user=user, token=create_session_token(user.id), created=False)
