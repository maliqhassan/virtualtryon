"""Checks a Firebase sign-in token (ADR 0012). Firebase only proves who the
user is; accounts and all their data stay in our database (app/services/
auth.py).

A Firebase ID token is a JWT signed by Google with RS256. It's accepted only
when the signature matches one of Google's published keys, and it was
issued for our Firebase project, by that project, to a real user, and hasn't
expired. Injected as an `IdentityVerifier`, so tests use a fake and an empty
FIREBASE_PROJECT_ID turns Google sign-in off.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Protocol

import jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Google's public keys for Firebase sign-in tokens. PyJWKClient caches them
# and fetches again when a token names a key it hasn't seen (key rotation).
_KEYS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)
_ISSUER_PREFIX = "https://securetoken.google.com/"
_CLOCK_SKEW_SECONDS = 60


@dataclass(frozen=True)
class VerifiedIdentity:
    uid: str
    # "google.com" for Google; "password", "apple.com"… for other methods.
    provider: str
    email: str | None
    email_verified: bool


class InvalidIdentityError(Exception):
    """The token is forged, expired, or for another project."""


class IdentityUnavailableError(Exception):
    """Sign-in can't be checked right now: not configured, or Google's keys
    couldn't be fetched."""


class IdentityVerifier(Protocol):
    async def verify(self, id_token: str) -> VerifiedIdentity: ...


class FirebaseTokenVerifier:
    def __init__(self, project_id: str, keys: jwt.PyJWKClient | None = None) -> None:
        self._project_id = project_id
        self._keys = keys or _shared_keys()

    async def verify(self, id_token: str) -> VerifiedIdentity:
        try:
            # A blocking fetch on the first token (and after rotation); cached after.
            key = await asyncio.to_thread(self._keys.get_signing_key_from_jwt, id_token)
        except jwt.PyJWKClientConnectionError as exc:
            logger.warning("Couldn't fetch Firebase signing keys: %s", exc)
            raise IdentityUnavailableError from exc
        except (jwt.PyJWKClientError, jwt.InvalidTokenError) as exc:
            raise InvalidIdentityError from exc
        try:
            claims = jwt.decode(
                id_token,
                key.key,
                algorithms=["RS256"],
                audience=self._project_id,
                issuer=_ISSUER_PREFIX + self._project_id,
                leeway=_CLOCK_SKEW_SECONDS,
                options={"require": ["exp", "iat", "aud", "iss", "sub"]},
            )
        except jwt.InvalidTokenError as exc:
            raise InvalidIdentityError from exc
        return _identity(claims)


def _identity(claims: dict) -> VerifiedIdentity:
    uid = claims.get("sub")
    firebase = claims.get("firebase")
    if not isinstance(uid, str) or not uid or len(uid) > 128 or not isinstance(firebase, dict):
        raise InvalidIdentityError
    email = claims.get("email")
    return VerifiedIdentity(
        uid=uid,
        provider=str(firebase.get("sign_in_provider", "")),
        email=email if isinstance(email, str) and email else None,
        email_verified=claims.get("email_verified") is True,
    )


class DisabledVerifier:
    """FIREBASE_PROJECT_ID not set: Google sign-in is off."""

    async def verify(self, id_token: str) -> VerifiedIdentity:
        raise IdentityUnavailableError


_keys_client: jwt.PyJWKClient | None = None


def _shared_keys() -> jwt.PyJWKClient:
    """One cache of Google's keys for the whole process."""
    global _keys_client
    if _keys_client is None:
        _keys_client = jwt.PyJWKClient(_KEYS_URL, cache_keys=True, timeout=10)
    return _keys_client


def get_identity_verifier() -> IdentityVerifier:
    project_id = get_settings().FIREBASE_PROJECT_ID
    return FirebaseTokenVerifier(project_id) if project_id else DisabledVerifier()
