"""Password hashing and session tokens (ADR 0010). Pure functions, no I/O.

Passwords: argon2id with argon2-cffi's defaults (OWASP's recommended
parameters). Hashing deliberately takes tens of milliseconds, so callers
run it in a worker thread rather than on the event loop.

Sessions: a JWT signed with SECRET_KEY (HS256) whose subject is the user id
and whose `ver` is the account's session version. Signing out deletes the
token on the phone; bumping `users.session_version` revokes every session
issued before (ADR 0012: when Google takes over an email account).
"""

from dataclasses import dataclass
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


@dataclass(frozen=True)
class SessionClaims:
    user_id: UUID
    version: int


def create_session_token(user_id: UUID, version: int = 0, *, now: datetime | None = None) -> str:
    issued = now or datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "ver": version,
        "iat": issued,
        "exp": issued + SESSION_LIFETIME,
    }
    return jwt.encode(claims, get_settings().SECRET_KEY, algorithm=_ALGORITHM)


def read_session_token(token: str) -> SessionClaims | None:
    """The claims of a valid, unexpired token, or None for anything else.
    Tokens from before session versions count as version 0."""
    try:
        claims = jwt.decode(
            token,
            get_settings().SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        version = claims.get("ver", 0)
        if not isinstance(version, int):
            return None
        return SessionClaims(user_id=UUID(claims["sub"]), version=version)
    except (jwt.PyJWTError, ValueError):
        return None
