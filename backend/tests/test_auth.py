"""Session tokens, and the removed email + password sign-in (ADR 0016).
Google sign-in has its own tests (test_google_sign_in.py)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_session_token


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


async def test_email_and_password_sign_in_is_gone(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/email", json={"email": "a@example.com", "password": "long enough"}
    )
    assert response.status_code == 404
