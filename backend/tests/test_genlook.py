"""The Genlook try-on client (ADR 0018). Every request goes to an
httpx.MockTransport, so nothing here spends a real Genlook credit."""

import io
import json

import httpx
import pytest
from PIL import Image
from src.models.inference_client import AIInferenceRequest
from src.models.inference_clients import tryon_service
from src.models.inference_clients.genlook_inference_client import GenlookInferenceClient
from src.models.inference_clients.tryon_service import TryOnServiceError

from app.core.config import get_settings
from app.worker.inference_client_provider import get_inference_client

RESULT_URL = "https://cdn.genlook.example/result.jpg"


def _jpeg(color=(200, 30, 30), size=(600, 800)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return buf.getvalue()


def _request(title: str | None = "Black denim jacket", category: str | None = "Jackets"):
    return AIInferenceRequest(
        user_image=Image.new("RGB", (600, 800), (10, 10, 200)),
        clothing_image=Image.new("RGBA", (400, 400), (0, 0, 0, 0)),
        clothing_title=title,
        clothing_category=category,
    )


def _client(handler, **kwargs) -> GenlookInferenceClient:
    return GenlookInferenceClient(
        api_key="gk_test", transport=httpx.MockTransport(handler), sleep=lambda _: None, **kwargs
    )


def _completed(generation_id: str = "gen1") -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "generationId": generation_id,
            "status": "COMPLETED",
            "resultImageUrl": RESULT_URL,
        },
    )


def _sent_payload(request: httpx.Request) -> tuple[dict, set[str]]:
    """The JSON `data` field and the names of the file fields of a multipart request."""
    content_type = request.headers["content-type"]
    boundary = content_type.split("boundary=")[1].encode()
    payload, files = None, set()
    for part in request.content.split(b"--" + boundary):
        head, _, body = part.partition(b"\r\n\r\n")
        if b'name="data"' in head:
            payload = json.loads(body.rstrip(b"\r\n").decode())
        elif b"filename=" in head:
            files.add(head.split(b'name="')[1].split(b'"')[0].decode())
    assert payload is not None
    return payload, files


def test_a_try_on_sends_both_photos_and_returns_the_result() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path.endswith("/try-on/sync"):
            return _completed()
        assert str(request.url) == RESULT_URL
        return httpx.Response(200, content=_jpeg(), headers={"content-type": "image/jpeg"})

    response = _client(handler).infer(_request())

    assert response.model_name == "genlook"
    assert response.generated_image.size == (600, 800)
    sync = seen[0]
    assert sync.headers["x-api-key"] == "gk_test"
    payload, files = _sent_payload(sync)
    assert files == {"person", "product"}
    product = payload["products"][0]
    assert product["title"] == "Black denim jacket"
    assert product["description"] == "Jackets"
    assert product["images"] == [{"source": {"fileKey": "product"}}]
    assert payload["person"] == {"image": {"source": {"fileKey": "person"}}}
    # Kept for Genlook's minimum, no watermark, no visible label; not a mock.
    assert payload["output"] == {"keepForDays": 1, "watermark": False, "aiLabel": False}
    assert "mock" not in payload


def test_each_try_on_uses_a_new_product_id() -> None:
    ids = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            ids.append(_sent_payload(request)[0]["products"][0]["externalId"])
            return _completed()
        return httpx.Response(200, content=_jpeg())

    client = _client(handler)
    client.infer(_request())
    client.infer(_request())
    assert len(set(ids)) == 2


def test_mock_mode_asks_for_genlooks_free_test() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            assert _sent_payload(request)[0]["mock"] is True
            return _completed()
        return httpx.Response(200, content=_jpeg())

    assert _client(handler, mock=True).infer(_request()).model_name == "genlook-mock"


def test_a_slow_try_on_is_checked_until_it_finishes() -> None:
    polls = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return httpx.Response(202, json={"generationId": "slow", "status": "PROCESSING"})
        if request.url.path.endswith("/generations/slow"):
            polls.append(1)
            if len(polls) < 3:
                return httpx.Response(200, json={"generationId": "slow", "status": "PROCESSING"})
            return _completed("slow")
        return httpx.Response(200, content=_jpeg())

    _client(handler).infer(_request())
    assert len(polls) == 3


@pytest.mark.parametrize(
    ("status", "body", "message"),
    [
        (402, {"code": "INSUFFICIENT_CREDITS"}, tryon_service.BUSY),
        (429, {"code": "RATE_LIMITED"}, tryon_service.BUSY),
        (401, {"code": "INVALID_API_KEY"}, tryon_service.NOT_SET_UP),
        (422, {"code": "NO_PERSON_DETECTED"}, tryon_service.NO_PERSON),
        (422, {"code": "PERSON_TOO_FAR"}, tryon_service.NO_PERSON),
        (422, {"code": "CONTENT_POLICY_VIOLATION"}, tryon_service.REJECTED),
        (500, {"code": "INTERNAL_ERROR"}, tryon_service.UNAVAILABLE),
        (504, {"code": "GENERATION_TIMEOUT"}, tryon_service.UNAVAILABLE),
        (502, "not json", tryon_service.UNAVAILABLE),
    ],
)
def test_refusals_become_plain_messages(status, body, message) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if isinstance(body, str):
            return httpx.Response(status, content=body.encode())
        return httpx.Response(status, json=body)

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == message


def test_a_failed_generation_is_reported() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return httpx.Response(202, json={"generationId": "g", "status": "PENDING"})
        return httpx.Response(
            200,
            json={
                "generationId": "g",
                "status": "FAILED",
                "errorCode": "GENERATION_FAILED",
            },
        )

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_a_network_failure_is_reported() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_a_result_link_that_is_not_https_is_not_fetched() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/try-on/sync"), "must not fetch the result link"
        return httpx.Response(
            200,
            json={
                "generationId": "g",
                "status": "COMPLETED",
                "resultImageUrl": "http://internal/x",
            },
        )

    with pytest.raises(TryOnServiceError):
        _client(handler).infer(_request())


def test_an_unreadable_result_is_reported() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return _completed()
        return httpx.Response(200, content=b"not an image")

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_without_a_key_nothing_is_sent() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no request expected")

    client = GenlookInferenceClient(api_key="", transport=httpx.MockTransport(handler))
    with pytest.raises(TryOnServiceError) as raised:
        client.infer(_request())
    assert str(raised.value) == tryon_service.NOT_SET_UP


def test_title_and_category_are_optional() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            product = _sent_payload(request)[0]["products"][0]
            assert "title" not in product and "description" not in product
            return _completed()
        return httpx.Response(200, content=_jpeg())

    _client(handler).infer(_request(title=None, category=None))


def test_provider_setting_picks_genlook(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "TRYON_PROVIDER", "genlook")
    assert isinstance(get_inference_client(), GenlookInferenceClient)


# Waiting, limits and odd answers


def test_a_rate_limit_while_checking_back_waits_and_checks_again() -> None:
    waits: list[float] = []
    checks = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return httpx.Response(202, json={"generationId": "g1", "status": "PENDING"})
        if request.url.path.endswith("/generations/g1"):
            checks.append(1)
            if len(checks) == 1:
                return httpx.Response(
                    429, json={"code": "RATE_LIMITED"}, headers={"retry-after": "5"}
                )
            return _completed("g1")
        return httpx.Response(200, content=_jpeg())

    client = GenlookInferenceClient(
        api_key="gk_test", transport=httpx.MockTransport(handler), sleep=waits.append
    )
    client.infer(_request())
    assert len(checks) == 2
    assert 5.0 in waits


def test_an_unusable_generation_id_is_never_put_in_a_url() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/try-on/sync"), "must not check a made-up id"
        return httpx.Response(202, json={"generationId": "../admin", "status": "PENDING"})

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_a_malformed_result_link_gives_the_plain_message() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"generationId": "g", "status": "COMPLETED", "resultImageUrl": "https://[bad"},
        )

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_the_result_link_may_redirect() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return _completed()
        if str(request.url) == RESULT_URL:
            return httpx.Response(302, headers={"location": "https://storage.example/final.jpg"})
        return httpx.Response(200, content=_jpeg())

    assert _client(handler).infer(_request()).generated_image.size == (600, 800)


def test_an_oversized_result_stops_downloading(monkeypatch: pytest.MonkeyPatch) -> None:
    from src.models.inference_clients import genlook_inference_client as genlook

    monkeypatch.setattr(genlook, "_MAX_RESULT_BYTES", 1000)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return _completed()
        return httpx.Response(200, content=b"x" * 5000)

    with pytest.raises(TryOnServiceError):
        _client(handler).infer(_request())


def test_a_try_on_past_the_deadline_gives_up(monkeypatch: pytest.MonkeyPatch) -> None:
    from src.models.inference_clients import genlook_inference_client as genlook

    monkeypatch.setattr(genlook, "_DEADLINE_SECONDS", 0.0)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/try-on/sync"):
            return httpx.Response(202, json={"generationId": "g", "status": "PROCESSING"})
        raise AssertionError("must not keep checking after the deadline")

    with pytest.raises(TryOnServiceError) as raised:
        _client(handler).infer(_request())
    assert str(raised.value) == tryon_service.UNAVAILABLE


def test_the_deadline_stays_under_the_stuck_job_cutoff() -> None:
    from src.models.inference_clients import genlook_inference_client as genlook

    from app.worker.job_processor import PROCESSING_TIMEOUT

    assert PROCESSING_TIMEOUT.total_seconds() > genlook._DEADLINE_SECONDS + 60
