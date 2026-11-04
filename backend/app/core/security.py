"""Password hashing and session tokens (ADR 0010). Pure functions, no I/O.

Passwords: argon2id with argon2-cffi's defaults (OWASP's recommended
parameters). Hashing deliberately takes tens of milliseconds, so callers
run it in a worker thread rather than on the event loop.

Sessions: a JWT signed with SECRET_KEY (HS256) whose subject is the user id.
Stateless on purpose (KISS): signing out deletes the token on the phone.
Revoking every session server-side would need a stored token version; add
that with "sign out everywhere" or account deletion, not before.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings

SESSION_LIFETIME = timedelta(days=30)
_ALGORITHM = "HS256"
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """True after the hashing parameters were raised; rehash on next sign-in."""
    return _hasher.check_needs_rehash(password_hash)


def create_session_token(user_id: UUID, *, now: datetime | None = None) -> str:
    issued = now or datetime.now(UTC)
    claims = {"sub": str(user_id), "iat": issued, "exp": issued + SESSION_LIFETIME}
    return jwt.encode(claims, get_settings().SECRET_KEY, algorithm=_ALGORITHM)


def read_session_token(token: str) -> UUID | None:
    """The user id in a valid, unexpired token, or None for anything else."""
    try:
        claims = jwt.decode(
            token,
            get_settings().SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        return UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
