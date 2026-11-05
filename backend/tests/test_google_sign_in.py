"""POST /api/v1/auth/google (ADR 0012). Endpoint tests use a fake verifier;
the real Firebase token check is tested with a locally generated RSA key,
so nothing here talks to Google."""

import io
import time
import uuid
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import AsyncClient
from PIL import Image

from app.main import app
from app.services.auth import reset_attempt_limits
from app.services.firebase_identity import (
    DisabledVerifier,
    FirebaseTokenVerifier,
    IdentityUnavailableError,
    InvalidIdentityError,
    VerifiedIdentity,
    get_identity_verifier,
)

PROJECT = "virtualtryon-test"
PASSWORD = "correct horse battery"


class FakeVerifier:
    """Maps a token to an identity; any other token is invalid."""

    def __init__(self, identities: dict[str, VerifiedIdentity]) -> None:
        self.identities = identities

    async def verify(self, id_token: str) -> VerifiedIdentity:
        if id_token not in self.identities:
            raise InvalidIdentityError
        return self.identities[id_token]


def _google(email: str | None = None, verified: bool = True, provider: str = "google.com"):
    return VerifiedIdentity(
        uid=uuid.uuid4().hex,
        provider=provider,
        email=email if email is not None else f"g-{uuid.uuid4().hex[:8]}@gmail.com",
        email_verified=verified,
    )


@pytest.fixture(autouse=True)
def _fresh_attempt_limits() -> None:
    reset_attempt_limits()


@pytest.fixture
def use_verifier():
    def install(verifier) -> None:
        app.dependency_overrides[get_identity_verifier] = lambda: verifier

    yield install
    app.dependency_overrides.pop(get_identity_verifier, None)


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(9, 9, 9)).save(buf, format="PNG")
    return buf.getvalue()


async def _sign_in(client: AsyncClient, token: str, headers: dict | None = None):
    return await client.post("/api/v1/auth/google", json={"id_token": token}, headers=headers)


def _bearer(body: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {body['token']}"}


async def test_first_google_sign_in_creates_an_account(client, use_verifier) -> None:
    identity = _google()
    use_verifier(FakeVerifier({"t": identity}))

    response = await _sign_in(client, "t")

    assert response.status_code == 200
    body = response.json()
    assert body["created"] is True
    assert body["account"] == {
        "email": identity.email,
        "auth_provider": "google",
        "plan": "free",
    }
    me = await client.get("/api/v1/auth/me", headers=_bearer(body))
    assert me.json()["email"] == identity.email


async def test_a_guest_keeps_their_wardrobe(client, use_verifier) -> None:
    guest = {"X-Device-Id": (await client.get("/api/v1/usage")).headers["x-device-id"]}
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
        headers=guest,
    )
    use_verifier(FakeVerifier({"t": _google()}))

    body = (await _sign_in(client, "t", headers=guest)).json()

    assert body["created"] is True
    garments = (await client.get("/api/v1/garments", headers=_bearer(body))).json()
    assert [g["id"] for g in garments] == [garment.json()["id"]]
    # The old device id now starts a fresh guest instead of reopening the account.
    assert (await client.get("/api/v1/auth/me", headers=guest)).json()["email"] is None


async def test_signing_in_again_returns_the_same_account(client, use_verifier) -> None:
    use_verifier(FakeVerifier({"t": _google()}))
    first = (await _sign_in(client, "t")).json()
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
        headers=_bearer(first),
    )

    again = await _sign_in(client, "t")

    assert again.json()["created"] is False
    garments = (await client.get("/api/v1/garments", headers=_bearer(again.json()))).json()
    assert [g["id"] for g in garments] == [garment.json()["id"]]


async def test_takes_over_an_email_account_and_removes_its_password(client, use_verifier) -> None:
    email = f"owner-{uuid.uuid4().hex[:8]}@gmail.com"
    squatter = await client.post("/api/v1/auth/email", json={"email": email, "password": PASSWORD})
    use_verifier(FakeVerifier({"t": _google(email=email.upper())}))

    body = (await _sign_in(client, "t")).json()

    assert body["created"] is False
    assert body["account"] == {"email": email, "auth_provider": "google", "plan": "free"}
    # Whoever registered the address is signed out everywhere: their old
    # session no longer works, and neither does the password.
    old_session = await client.get("/api/v1/auth/me", headers=_bearer(squatter.json()))
    assert old_session.status_code == 401
    assert old_session.json()["detail"]["code"] == "session_expired"
    again = await client.post("/api/v1/auth/email", json={"email": email, "password": PASSWORD})
    assert again.status_code == 401
    me = await client.get("/api/v1/auth/me", headers=_bearer(body))
    assert me.json()["email"] == email


async def test_an_unverified_email_is_not_trusted(client, use_verifier) -> None:
    email = f"someone-{uuid.uuid4().hex[:8]}@gmail.com"
    await client.post("/api/v1/auth/email", json={"email": email, "password": PASSWORD})
    use_verifier(FakeVerifier({"t": _google(email=email, verified=False)}))

    body = (await _sign_in(client, "t")).json()

    assert body["created"] is True
    assert body["account"]["email"] is None
    still = await client.post("/api/v1/auth/email", json={"email": email, "password": PASSWORD})
    assert still.status_code == 200


async def test_other_firebase_sign_in_methods_are_refused(client, use_verifier) -> None:
    use_verifier(FakeVerifier({"t": _google(provider="password")}))
    response = await _sign_in(client, "t")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_google_sign_in"


async def test_an_invalid_token_is_refused(client, use_verifier) -> None:
    use_verifier(FakeVerifier({}))
    response = await _sign_in(client, "forged")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_google_sign_in"


async def test_says_unavailable_when_not_configured(client, use_verifier) -> None:
    use_verifier(DisabledVerifier())
    response = await _sign_in(client, "t")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "google_sign_in_unavailable"


# The real verifier, against tokens signed with a key made here.

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeKeys:
    """Stands in for PyJWKClient: Google's published key is _KEY."""

    def get_signing_key_from_jwt(self, token: str):
        jwt.get_unverified_header(token)  # malformed tokens fail like the real one
        return SimpleNamespace(key=_KEY.public_key())


def _token(key=_KEY, **overrides) -> str:
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{PROJECT}",
        "aud": PROJECT,
        "sub": "firebase-uid-1",
        "iat": now,
        "exp": now + 3600,
        "email": "me@gmail.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "google.com"},
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "k1"})


async def test_real_verifier_accepts_a_genuine_token() -> None:
    identity = await FirebaseTokenVerifier(PROJECT, keys=FakeKeys()).verify(_token())
    assert identity == VerifiedIdentity("firebase-uid-1", "google.com", "me@gmail.com", True)


@pytest.mark.parametrize(
    "token",
    [
        _token(key=_OTHER_KEY),  # not signed by Google
        _token(aud="someone-elses-project"),
        _token(iss="https://securetoken.google.com/someone-elses-project"),
        _token(exp=int(time.time()) - 3600),
        _token(sub=""),
        "not-a-jwt",
    ],
    ids=["wrong-key", "wrong-audience", "wrong-issuer", "expired", "no-user", "garbage"],
)
async def test_real_verifier_refuses_bad_tokens(token: str) -> None:
    with pytest.raises(InvalidIdentityError):
        await FirebaseTokenVerifier(PROJECT, keys=FakeKeys()).verify(token)


async def test_real_verifier_reports_googles_keys_being_unreachable() -> None:
    class Unreachable:
        def get_signing_key_from_jwt(self, token: str):
            raise jwt.PyJWKClientConnectionError("down")

    with pytest.raises(IdentityUnavailableError):
        await FirebaseTokenVerifier(PROJECT, keys=Unreachable()).verify(_token())
