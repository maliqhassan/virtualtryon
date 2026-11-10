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


async def _new_guest(client: AsyncClient) -> dict[str, str]:
    return {"X-Device-Id": (await client.get("/api/v1/usage")).headers["x-device-id"]}


async def _add_garment(client: AsyncClient, headers: dict, title: str) -> str:
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": title, "category": "Jackets"},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


async def test_signing_in_again_brings_the_guests_things_along(client, use_verifier) -> None:
    use_verifier(FakeVerifier({"t": _google()}))
    account = (await _sign_in(client, "t")).json()
    own_piece = await _add_garment(client, _bearer(account), "Own coat")

    # Signed out on this phone, the person used the app as a guest.
    guest = await _new_guest(client)
    guest_piece = await _add_garment(client, guest, "Guest scarf")
    photo = await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png(), "image/png")},
        headers=guest,
    )
    job = await client.post(
        "/api/v1/inference-jobs", json={"garment_id": guest_piece}, headers=guest
    )
    assert job.status_code == 201

    again = await _sign_in(client, "t", headers=guest)

    body = again.json()
    assert body["created"] is False
    signed_in = _bearer(body)
    pieces = {g["id"] for g in (await client.get("/api/v1/garments", headers=signed_in)).json()}
    assert pieces == {own_piece, guest_piece}
    current = (await client.get("/api/v1/user-photos/current", headers=signed_in)).json()
    assert current["id"] == photo.json()["id"]
    jobs = (await client.get("/api/v1/inference-jobs", headers=signed_in)).json()
    assert [j["id"] for j in jobs] == [job.json()["id"]]
    # The emptied guest is gone: its device id now starts a fresh guest.
    assert (await client.get("/api/v1/garments", headers=guest)).json() == []


async def test_the_accounts_own_style_profile_wins(client, use_verifier) -> None:
    use_verifier(FakeVerifier({"t": _google()}))
    account = (await _sign_in(client, "t")).json()
    await client.post(
        "/api/v1/profile",
        json={"display_name": "Account", "height_cm": 170, "weight_kg": 60},
        headers=_bearer(account),
    )
    guest = await _new_guest(client)
    await client.post(
        "/api/v1/profile",
        json={"display_name": "Guest", "height_cm": 160, "weight_kg": 50},
        headers=guest,
    )

    body = (await _sign_in(client, "t", headers=guest)).json()

    profile = (await client.get("/api/v1/profile", headers=_bearer(body))).json()
    assert profile["display_name"] == "Account"


async def test_a_guests_style_profile_moves_when_the_account_has_none(client, use_verifier) -> None:
    use_verifier(FakeVerifier({"t": _google()}))
    await _sign_in(client, "t")
    guest = await _new_guest(client)
    await client.post(
        "/api/v1/profile",
        json={"display_name": "Guest", "height_cm": 160, "weight_kg": 50},
        headers=guest,
    )

    body = (await _sign_in(client, "t", headers=guest)).json()

    profile = (await client.get("/api/v1/profile", headers=_bearer(body))).json()
    assert profile["display_name"] == "Guest"


async def test_one_photo_per_view_is_kept_and_the_older_file_removed(client, use_verifier) -> None:
    from app.services.storage import get_storage_service

    use_verifier(FakeVerifier({"t": _google()}))
    account = (await _sign_in(client, "t")).json()
    older = await client.post(
        "/api/v1/user-photos",
        files={"image": ("old.png", _png(), "image/png")},
        headers=_bearer(account),
    )
    guest = await _new_guest(client)
    newer = await client.post(
        "/api/v1/user-photos",
        files={"image": ("new.png", _png(), "image/png")},
        headers=guest,
    )

    body = (await _sign_in(client, "t", headers=guest)).json()

    photos = (await client.get("/api/v1/user-photos", headers=_bearer(body))).json()
    assert [p["id"] for p in photos] == [newer.json()["id"]]
    with pytest.raises(FileNotFoundError):
        get_storage_service().read(older.json()["storage_key"])


async def test_google_taking_over_an_email_account_also_merges(client, use_verifier) -> None:
    email = f"merge-{uuid.uuid4().hex[:8]}@gmail.com"
    await client.post("/api/v1/auth/email", json={"email": email, "password": PASSWORD})
    guest = await _new_guest(client)
    piece = await _add_garment(client, guest, "Guest scarf")
    use_verifier(FakeVerifier({"t": _google(email=email)}))

    body = (await _sign_in(client, "t", headers=guest)).json()

    assert body["created"] is False
    pieces = [g["id"] for g in (await client.get("/api/v1/garments", headers=_bearer(body))).json()]
    assert pieces == [piece]


async def test_a_signed_in_caller_is_not_merged(client, use_verifier) -> None:
    """Only an unclaimed guest moves; another account signing in stays whole."""
    use_verifier(FakeVerifier({"a": _google(), "b": _google()}))
    first = (await _sign_in(client, "a")).json()
    first_piece = await _add_garment(client, _bearer(first), "First's coat")
    second = (await _sign_in(client, "b")).json()

    body = (await _sign_in(client, "a", headers=_bearer(second))).json()

    pieces = [g["id"] for g in (await client.get("/api/v1/garments", headers=_bearer(body))).json()]
    assert pieces == [first_piece]
    still = await client.get("/api/v1/auth/me", headers=_bearer(second))
    assert still.status_code == 200


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
