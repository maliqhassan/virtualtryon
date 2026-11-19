"""DELETE /api/v1/account (ADR 0015): removes the account and everything in
it. A Google account must confirm with a fresh Google sign-in first."""

import asyncio
import io
import time
import uuid
from dataclasses import replace
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import func, select

import app.db.session as db_session
from app.db.repositories.user_repository import UserRepository
from app.main import app
from app.models.inference_job import InferenceJob
from app.services.auth import reset_attempt_limits
from app.services.firebase_identity import (
    IdentityUnavailableError,
    InvalidIdentityError,
    VerifiedIdentity,
    _identity,
    get_identity_verifier,
)
from app.services.inference_jobs import mark_completed
from app.services.storage import get_storage_service
from app.services.storage.local_storage import LocalStorageProvider
from app.worker.inference_worker import InferenceAttempt
from app.worker.job_processor import JobProcessor


class FakeVerifier:
    def __init__(self, identities: dict[str, VerifiedIdentity]) -> None:
        self.identities = identities

    async def verify(self, id_token: str) -> VerifiedIdentity:
        if id_token not in self.identities:
            raise InvalidIdentityError
        return self.identities[id_token]


class UnavailableVerifier:
    async def verify(self, id_token: str) -> VerifiedIdentity:
        raise IdentityUnavailableError


@pytest.fixture(autouse=True)
def _fresh_attempt_limits() -> None:
    reset_attempt_limits()


@pytest.fixture
def use_verifier():
    def install(verifier) -> None:
        app.dependency_overrides[get_identity_verifier] = lambda: verifier

    yield install
    app.dependency_overrides.pop(get_identity_verifier, None)


def _png(color: tuple[int, int, int] = (9, 9, 9)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _google(signed_in_ago: float = 0) -> VerifiedIdentity:
    return VerifiedIdentity(
        uid=uuid.uuid4().hex,
        provider="google.com",
        email=f"g-{uuid.uuid4().hex[:8]}@gmail.com",
        email_verified=True,
        auth_time=int(time.time() - signed_in_ago),
    )


async def _fill_account(client: AsyncClient, headers: dict[str, str]) -> list[str]:
    """A garment, a photo, a finished try-on and a saved look; returns the
    stored file paths."""
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
        headers=headers,
    )
    assert garment.status_code == 201
    photo = await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png((8, 8, 8)), "image/png")},
        headers=headers,
    )
    assert photo.status_code == 201
    await client.post("/api/v1/profile", json={"height_cm": 170, "weight_kg": 60}, headers=headers)
    job = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment.json()["id"]},
        headers=headers,
    )
    assert job.status_code == 201
    result_url = get_storage_service().save(_png((7, 7, 7)), "png")
    async with db_session.AsyncSessionLocal() as db:
        await mark_completed(db, UUID(job.json()["id"]), generated_image_url=result_url)
    look = await client.post(
        "/api/v1/saved-looks/from-job",
        json={"job_id": job.json()["id"]},
        headers=headers,
    )
    assert look.status_code == 201
    return [
        garment.json()["image_url"],
        photo.json()["storage_key"],
        result_url,
        look.json()["generated_image_url"],
    ]


def _assert_files_gone(paths: list[str]) -> None:
    storage = get_storage_service()
    for path in paths:
        with pytest.raises(FileNotFoundError):
            storage.read(path)


async def _job_count() -> int:
    async with db_session.AsyncSessionLocal() as db:
        return int(await db.scalar(select(func.count()).select_from(InferenceJob)) or 0)


# Guests


async def test_a_guest_deletes_their_account_and_everything_in_it(
    client: AsyncClient,
) -> None:
    device_id = (await client.get("/api/v1/usage")).headers["x-device-id"]
    headers = {"X-Device-Id": device_id}
    files = await _fill_account(client, headers)
    jobs_before = await _job_count()

    response = await client.delete("/api/v1/account", headers=headers)

    assert response.status_code == 204
    _assert_files_gone(files)
    assert await _job_count() == jobs_before - 1  # the try-on history is gone too
    async with db_session.AsyncSessionLocal() as db:
        assert await UserRepository(db).get_by_device_id(device_id) is None
    # The old device id now just starts a brand-new, empty guest.
    after = await client.get("/api/v1/garments", headers=headers)
    assert after.json() == []
    assert after.headers["x-device-id"] != device_id


# Google accounts


async def _google_account(client: AsyncClient, use_verifier, identity: VerifiedIdentity) -> dict:
    use_verifier(FakeVerifier({"sign-in": identity}))
    response = await client.post("/api/v1/auth/google", json={"id_token": "sign-in"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


async def test_a_google_account_is_deleted_after_confirming(client, use_verifier) -> None:
    identity = _google()
    headers = await _google_account(client, use_verifier, identity)
    files = await _fill_account(client, headers)
    use_verifier(FakeVerifier({"confirm": identity}))

    response = await client.request(
        "DELETE", "/api/v1/account", json={"id_token": "confirm"}, headers=headers
    )

    assert response.status_code == 204
    _assert_files_gone(files)
    async with db_session.AsyncSessionLocal() as db:
        repo = UserRepository(db)
        assert await repo.get_by_firebase_uid(identity.uid) is None
        assert await repo.get_by_email(identity.email or "") is None
    # The session is dead, and signing in again makes a new, empty account.
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401
    use_verifier(FakeVerifier({"again": identity}))
    again = await client.post("/api/v1/auth/google", json={"id_token": "again"})
    assert again.json()["created"] is True


@pytest.mark.parametrize(
    "confirmation",
    ["missing", "invalid", "old sign-in", "other account", "no sign-in time"],
)
async def test_a_google_account_is_kept_without_a_fresh_confirmation(
    client, use_verifier, confirmation: str
) -> None:
    identity = _google()
    headers = await _google_account(client, use_verifier, identity)
    tokens = {
        "old sign-in": replace(identity, auth_time=int(time.time()) - 10 * 60),
        "other account": _google(),
        "no sign-in time": replace(identity, auth_time=None),
    }
    use_verifier(FakeVerifier(tokens))
    body = None if confirmation == "missing" else {"id_token": confirmation}

    response = await client.request("DELETE", "/api/v1/account", json=body, headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "confirmation_required"
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200


async def test_deleting_says_so_when_google_cannot_be_checked(client, use_verifier) -> None:
    headers = await _google_account(client, use_verifier, _google())
    use_verifier(UnavailableVerifier())

    response = await client.request(
        "DELETE", "/api/v1/account", json={"id_token": "x"}, headers=headers
    )

    assert response.status_code == 503
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200


async def test_deleting_one_account_leaves_others_alone(client, use_verifier) -> None:
    other = {"X-Device-Id": (await client.get("/api/v1/usage")).headers["x-device-id"]}
    other_files = await _fill_account(client, other)
    me = {"X-Device-Id": (await client.get("/api/v1/usage")).headers["x-device-id"]}

    assert (await client.delete("/api/v1/account", headers=me)).status_code == 204

    assert len((await client.get("/api/v1/garments", headers=other)).json()) == 1
    storage = get_storage_service()
    for path in other_files:
        assert storage.read(path)


# Reading the sign-in time from a Firebase token


def test_the_sign_in_time_is_read_from_the_token() -> None:
    claims = {
        "sub": "u1",
        "firebase": {"sign_in_provider": "google.com"},
        "auth_time": 1700000000,
    }
    assert _identity(claims).auth_time == 1700000000
    assert _identity({**claims, "auth_time": "soon"}).auth_time is None
    assert _identity({**claims, "auth_time": True}).auth_time is None


# A try-on running while its account is deleted


class _DeletesTheAccountMidway:
    """An inference worker that deletes the account while "generating", then
    returns a result, as a real try-on finishing after the deletion would."""

    def __init__(self, loop: asyncio.AbstractEventLoop, client: AsyncClient, headers) -> None:
        self._loop = loop
        self._client = client
        self._headers = headers

    def attempt(self, user_image_storage_key: str, garment_image_storage_key: str, **_garment):
        deleted = asyncio.run_coroutine_threadsafe(
            self._client.delete("/api/v1/account", headers=self._headers), self._loop
        ).result()
        assert deleted.status_code == 204
        return InferenceAttempt(
            generated_image=Image.new("RGB", (8, 8)),
            model_name="fake",
            error_message=None,
        )


async def test_a_try_on_finishing_after_its_account_was_deleted_is_dropped(
    client: AsyncClient, tmp_path
) -> None:
    headers = {"X-Device-Id": (await client.get("/api/v1/usage")).headers["x-device-id"]}
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png(), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
        headers=headers,
    )
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png(), "image/png")},
        headers=headers,
    )
    job = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment.json()["id"]},
        headers=headers,
    )
    job_id = UUID(job.json()["id"])
    storage = LocalStorageProvider(tmp_path)
    worker = _DeletesTheAccountMidway(asyncio.get_running_loop(), client, headers)

    async with db_session.AsyncSessionLocal() as db:
        outcome = await JobProcessor(db, worker, storage).process_single_job(job_id)

    assert outcome is None  # nothing to report: the job is gone with the account
    assert list(tmp_path.iterdir()) == []  # and its result wasn't kept
    async with db_session.AsyncSessionLocal() as db:
        assert await db.get(InferenceJob, job_id) is None
