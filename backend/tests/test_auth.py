import io
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from PIL import Image

from app.core.security import create_session_token
from app.services.auth import ATTEMPTS_PER_EMAIL, reset_attempt_limits

PASSWORD = "correct horse battery"


@pytest.fixture(autouse=True)
def _fresh_attempt_limits() -> None:
    reset_attempt_limits()


def _email() -> str:
    return f"user-{uuid.uuid4().hex[:10]}@example.com"


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(9, 9, 9)).save(buf, format="PNG")
    return buf.getvalue()


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _new_guest(client: AsyncClient) -> dict[str, str]:
    response = await client.get("/api/v1/usage")
    return {"X-Device-Id": response.headers["x-device-id"]}


async def test_new_email_turns_the_guest_into_an_account_and_keeps_its_data(
    client: AsyncClient,
) -> None:
    guest = await _new_guest(client)
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
        headers=guest,
    )
    email = _email()

    response = await client.post(
        "/api/v1/auth/email", json={"email": email, "password": PASSWORD}, headers=guest
    )

    assert response.status_code == 200
    body = response.json()
    assert body["created"] is True
    assert body["account"]["email"] == email
    assert body["account"]["auth_provider"] == "email"
    signed_in = _bearer(body["token"])
    garments = (await client.get("/api/v1/garments", headers=signed_in)).json()
    assert [g["id"] for g in garments] == [garment.json()["id"]]
    me = (await client.get("/api/v1/auth/me", headers=signed_in)).json()
    assert me["email"] == email


async def test_the_old_device_id_no_longer_reaches_the_account(client: AsyncClient) -> None:
    guest = await _new_guest(client)
    await client.post(
        "/api/v1/auth/email", json={"email": _email(), "password": PASSWORD}, headers=guest
    )

    # After signing out the phone still holds the old device id; it must
    # start a fresh guest, not reopen the account.
    response = await client.get("/api/v1/auth/me", headers=guest)

    assert response.json()["email"] is None
    assert response.headers["x-device-id"] != guest["X-Device-Id"]


async def test_known_email_signs_in_from_another_phone(client: AsyncClient) -> None:
    email = _email()
    first = await client.post(
        "/api/v1/auth/email",
        json={"email": email, "password": PASSWORD},
        headers=await _new_guest(client),
    )

    second = await client.post(
        "/api/v1/auth/email",
        json={"email": email.upper(), "password": PASSWORD},
        headers=await _new_guest(client),
    )

    assert second.status_code == 200
    assert second.json()["created"] is False
    me_first = (await client.get("/api/v1/auth/me", headers=_bearer(first.json()["token"]))).json()
    me_second = (
        await client.get("/api/v1/auth/me", headers=_bearer(second.json()["token"]))
    ).json()
    assert me_first == me_second


async def test_wrong_password_is_refused(client: AsyncClient) -> None:
    email = _email()
    await client.post(
        "/api/v1/auth/email",
        json={"email": email, "password": PASSWORD},
        headers=await _new_guest(client),
    )

    response = await client.post(
        "/api/v1/auth/email",
        json={"email": email, "password": "not the password"},
        headers=await _new_guest(client),
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "wrong_password"


@pytest.mark.parametrize(
    ("email", "password"),
    [("not-an-email", PASSWORD), ("a@b", PASSWORD), (_email(), "short"), (_email(), "x" * 129)],
)
async def test_bad_input_is_rejected(client: AsyncClient, email: str, password: str) -> None:
    response = await client.post("/api/v1/auth/email", json={"email": email, "password": password})

    assert response.status_code == 422


async def test_repeated_guesses_are_limited_per_email(client: AsyncClient) -> None:
    email = _email()
    await client.post(
        "/api/v1/auth/email",
        json={"email": email, "password": PASSWORD},
        headers=await _new_guest(client),
    )
    statuses = []
    for _ in range(ATTEMPTS_PER_EMAIL):
        response = await client.post(
            "/api/v1/auth/email",
            json={"email": email, "password": "wrong password"},
            headers=await _new_guest(client),
        )
        statuses.append(response.status_code)

    assert statuses[-1] == 429
    assert set(statuses[:-1]) == {401}


@pytest.mark.parametrize(
    "header",
    [
        "Bearer not-a-token",
        "Basic abc",
        f"Bearer {create_session_token(uuid.uuid4())}",  # valid signature, no such user
        f"Bearer {create_session_token(uuid.uuid4(), now=datetime.now(UTC) - timedelta(days=31))}",
    ],
)
async def test_invalid_session_is_refused_not_downgraded(client: AsyncClient, header: str) -> None:
    response = await client.get("/api/v1/garments", headers={"Authorization": header})

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "session_expired"
    assert "x-device-id" not in response.headers
