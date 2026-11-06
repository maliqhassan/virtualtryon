"""Real try-ons through VTON-D (ADR 0013), against a fake VTON-D: the
tests never make a real API call. Also the server-wide daily cap and the
setting rules that go with a real provider."""

import io
from datetime import UTC, datetime, time
from uuid import UUID

import httpx
import pytest
from httpx import AsyncClient
from PIL import Image
from src.models.inference_client import AIInferenceRequest
from src.models.inference_clients import vton_d_inference_client as vton_d
from src.models.inference_clients.vton_d_inference_client import (
    TryOnServiceError,
    VtonDInferenceClient,
)

import app.db.session as db_session
from app.core.config import Settings, get_settings
from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.services.inference_jobs import mark_failed
from app.services.storage import get_storage_service
from app.services.usage import STALE_JOB_AFTER
from app.worker import worker_service
from app.worker.inference_client_provider import get_inference_client
from app.worker.worker_service import WorkerService


def _image(size: tuple[int, int] = (64, 96), color=(200, 180, 160)) -> Image.Image:
    return Image.new("RGB", size, color)


def _jpeg(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


def _request() -> AIInferenceRequest:
    return AIInferenceRequest(user_image=_image(), clothing_image=_image(color=(180, 40, 40)))


def _client(handler) -> VtonDInferenceClient:
    return VtonDInferenceClient(api_key="test-key", transport=httpx.MockTransport(handler))


# --- the client --------------------------------------------------------------


def test_sends_both_photos_and_returns_the_try_on() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["key"] = request.headers["x-rapidapi-key"]
        seen["host"] = request.headers["x-rapidapi-host"]
        seen["body"] = request.read()
        return httpx.Response(
            200, content=_jpeg(_image((48, 64))), headers={"content-type": "image/jpeg"}
        )

    response = _client(handler).infer(_request())

    assert seen["url"] == "https://try-on-diffusion.p.rapidapi.com/try-on-file"
    assert seen["key"] == "test-key"
    assert seen["host"] == "try-on-diffusion.p.rapidapi.com"
    assert b'name="avatar_image"' in seen["body"]
    assert b'name="clothing_image"' in seen["body"]
    assert response.model_name == "vton-d"
    assert response.generated_image.size == (48, 64)
    assert response.generated_image.mode == "RGB"


def test_uploads_photos_upright_and_no_larger_than_needed() -> None:
    uploads: list[Image.Image] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = request.read()
        # Each JPEG part starts at the SOI marker and ends at EOI.
        start = 0
        while (start := body.find(b"\xff\xd8", start)) != -1:
            end = body.find(b"\xff\xd9", start) + 2
            uploads.append(Image.open(io.BytesIO(body[start:end])))
            start = end
        return httpx.Response(200, content=_jpeg(_image()), headers={"content-type": "image/jpeg"})

    # A phone photo stored sideways, with EXIF orientation 6 ("rotate 90° CW").
    sideways = _image((3000, 2000))
    exif = sideways.getexif()
    exif[0x0112] = 6
    buf = io.BytesIO()
    sideways.save(buf, format="JPEG", exif=exif)
    phone_photo = Image.open(io.BytesIO(buf.getvalue()))

    _client(handler).infer(AIInferenceRequest(user_image=phone_photo, clothing_image=_image()))

    person = uploads[0]
    assert person.height > person.width  # turned upright
    assert max(person.size) == 1280


@pytest.mark.parametrize(
    ("status", "message"),
    [
        (429, vton_d.BUSY),
        (400, vton_d.REJECTED),
        (422, vton_d.REJECTED),
        (403, vton_d.NOT_SET_UP),
        (500, vton_d.UNAVAILABLE),
    ],
)
def test_errors_become_plain_messages(status: int, message: str) -> None:
    client = _client(lambda _request: httpx.Response(status, json={"detail": "internal detail"}))
    with pytest.raises(TryOnServiceError) as raised:
        client.infer(_request())
    assert str(raised.value) == message


def test_transparent_garments_are_sent_on_white() -> None:
    uploads: list[Image.Image] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = request.read()
        start = body.rfind(b"\xff\xd8")  # the clothing image is the second part
        uploads.append(Image.open(io.BytesIO(body[start : body.rfind(b"\xff\xd9") + 2])))
        return httpx.Response(200, content=_jpeg(_image()), headers={"content-type": "image/jpeg"})

    cut_out = Image.new("RGBA", (40, 40), (0, 0, 0, 0))  # fully transparent
    _client(handler).infer(AIInferenceRequest(user_image=_image(), clothing_image=cut_out))

    red, green, blue = uploads[0].getpixel((5, 5))
    assert min(red, green, blue) > 240  # white, not black


def test_a_damaged_photo_gives_a_plain_message_and_no_request() -> None:
    calls: list[httpx.Request] = []
    buf = io.BytesIO()
    Image.effect_noise((400, 400), 64).convert("RGB").save(buf, format="JPEG")
    data = buf.getvalue()
    # Cut in the middle of the pixel data: the header opens, decoding fails.
    damaged = Image.open(io.BytesIO(data[: len(data) // 2]))

    client = _client(lambda r: calls.append(r) or httpx.Response(200))
    with pytest.raises(TryOnServiceError) as raised:
        client.infer(AIInferenceRequest(user_image=damaged, clothing_image=_image()))
    assert str(raised.value) == vton_d.UNREADABLE
    assert calls == []


def test_a_non_image_answer_is_unavailable() -> None:
    client = _client(lambda _request: httpx.Response(200, json={"oops": True}))
    with pytest.raises(TryOnServiceError, match="didn’t respond"):
        client.infer(_request())


def test_a_broken_image_is_unavailable() -> None:
    client = _client(
        lambda _request: httpx.Response(
            200, content=b"not a jpeg", headers={"content-type": "image/jpeg"}
        )
    )
    with pytest.raises(TryOnServiceError, match="didn’t respond"):
        client.infer(_request())


def test_network_failure_is_unavailable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out", request=request)

    with pytest.raises(TryOnServiceError, match="didn’t respond"):
        _client(handler).infer(_request())


def test_no_key_makes_no_request() -> None:
    calls: list[httpx.Request] = []
    client = VtonDInferenceClient(
        api_key="", transport=httpx.MockTransport(lambda r: calls.append(r) or httpx.Response(200))
    )
    with pytest.raises(TryOnServiceError, match="isn’t set up"):
        client.infer(_request())
    assert calls == []


# --- settings ----------------------------------------------------------------


def test_provider_setting_picks_vton_d(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "TRYON_PROVIDER", "vton_d")
    assert isinstance(get_inference_client(), VtonDInferenceClient)


def test_limits_off_on_a_real_provider_needs_the_daily_cap() -> None:
    with pytest.raises(ValueError, match="TRYON_DAILY_LIMIT"):
        Settings(TRYON_PROVIDER="vton_d", TRYON_LIMITS_ENABLED=False, TRYON_DAILY_LIMIT=0)
    allowed = Settings(TRYON_PROVIDER="vton_d", TRYON_LIMITS_ENABLED=False, TRYON_DAILY_LIMIT=10)
    assert allowed.TRYON_DAILY_LIMIT == 10


# --- through the API and the worker -------------------------------------------


async def _guest_with_garment(client: AsyncClient) -> tuple[str, str]:
    """Returns (device_id, garment_id) for a new guest with a photo."""
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("garment.jpg", _jpeg(_image(color=(180, 40, 40))), "image/jpeg")},
        data={"title": "Red top", "category": "tops"},
    )
    assert garment.status_code == 201
    device_id = garment.headers["x-device-id"]
    photo = await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.jpg", _jpeg(_image()), "image/jpeg")},
        headers={"X-Device-Id": device_id},
    )
    assert photo.status_code == 201
    return device_id, garment.json()["id"]


async def _start(client: AsyncClient, device_id: str, garment_id: str) -> httpx.Response:
    return await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment_id},
        headers={"X-Device-Id": device_id},
    )


async def test_daily_cap_pauses_try_ons_for_everyone(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "TRYON_PROVIDER", "vton_d")
    # Other tests' try-ons today share the test database: room for two more.
    now = datetime.now(UTC)
    async with db_session.AsyncSessionLocal() as db:
        already = await InferenceJobRepository(db).count_counted_since(
            datetime.combine(now.date(), time.min, tzinfo=UTC), stale_before=now - STALE_JOB_AFTER
        )
    monkeypatch.setattr(settings, "TRYON_DAILY_LIMIT", already + 2)

    first_device, first_garment = await _guest_with_garment(client)
    second_device, second_garment = await _guest_with_garment(client)
    first = await _start(client, first_device, first_garment)
    assert first.status_code == 201
    assert (await _start(client, second_device, second_garment)).status_code == 201

    refused = await _start(client, first_device, first_garment)
    assert refused.status_code == 429
    assert refused.json()["detail"]["code"] == "tryons_paused"

    # A failed try-on gives its place back.
    async with db_session.AsyncSessionLocal() as db:
        await mark_failed(db, UUID(first.json()["id"]), error_message="failed")
    assert (await _start(client, first_device, first_garment)).status_code == 201


async def test_daily_cap_does_not_apply_to_the_demo(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "TRYON_PROVIDER", "demo")
    monkeypatch.setattr(settings, "TRYON_DAILY_LIMIT", 1)
    device_id, garment_id = await _guest_with_garment(client)
    for _ in range(3):
        assert (await _start(client, device_id, garment_id)).status_code == 201


async def test_worker_stores_the_try_on(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    result = _jpeg(_image((48, 64), color=(10, 120, 200)))
    fake = _client(
        lambda _request: httpx.Response(200, content=result, headers={"content-type": "image/jpeg"})
    )
    monkeypatch.setattr(worker_service, "get_inference_client", lambda: fake)
    device_id, garment_id = await _guest_with_garment(client)
    job_id = (await _start(client, device_id, garment_id)).json()["id"]

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job_id))

    body = (
        await client.get(f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id})
    ).json()
    assert body["status"] == "completed"
    stored = Image.open(io.BytesIO(get_storage_service().read(body["generated_image_url"])))
    assert stored.size == (48, 64)


async def test_worker_shows_the_plain_message_when_vton_d_is_busy(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = _client(lambda _request: httpx.Response(429, json={"message": "quota"}))
    monkeypatch.setattr(worker_service, "get_inference_client", lambda: fake)
    device_id, garment_id = await _guest_with_garment(client)
    job_id = (await _start(client, device_id, garment_id)).json()["id"]

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job_id))

    body = (
        await client.get(f"/api/v1/inference-jobs/{job_id}", headers={"X-Device-Id": device_id})
    ).json()
    assert body["status"] == "failed"
    assert body["error_message"] == vton_d.BUSY
