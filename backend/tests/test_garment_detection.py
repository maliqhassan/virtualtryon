"""POST /api/v1/garments/detect-category, with fake detectors: no paid API
calls in tests. The real detector's response parsing is tested against a
recorded answer through a mock transport."""

import io

import httpx
import pytest
from httpx import AsyncClient
from PIL import Image

from app.main import app
from app.services import garment_detection
from app.services.garment_detection import (
    Api4aiFashionDetector,
    DetectionError,
    Label,
    get_garment_detector,
)
from app.services.image_validation import ImageUpload

# Their answer for https://static.api4.ai/samples/fashion-1.jpg, trimmed.
RECORDED_ANSWER = {
    "results": [
        {
            "status": {"code": "ok", "message": "Success"},
            "entities": [
                {
                    "kind": "objects",
                    "name": "fashion",
                    "objects": [
                        {
                            "box": [0.1, 0.2, 0.4, 0.4],
                            "entities": [
                                {"kind": "classes", "name": "classes", "classes": {"top": 0.88}}
                            ],
                        },
                        {
                            "box": [0.2, 0.6, 0.2, 0.3],
                            "entities": [
                                {"kind": "classes", "name": "classes", "classes": {"pants": 0.91}}
                            ],
                        },
                        {
                            "box": [0.1, 0.2, 0.4, 0.7],
                            "entities": [
                                {
                                    "kind": "classes",
                                    "name": "classes",
                                    "classes": {"clothing": 0.95},
                                }
                            ],
                        },
                    ],
                }
            ],
        }
    ]
}


def _jpeg(color: tuple[int, int, int] = (40, 60, 200)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 60), color=color).save(buffer, format="JPEG")
    return buffer.getvalue()


class FakeDetector:
    def __init__(self, labels: list[Label] | Exception) -> None:
        self.labels = labels
        self.calls = 0

    async def detect(self, image: ImageUpload) -> list[Label]:
        self.calls += 1
        if isinstance(self.labels, Exception):
            raise self.labels
        return self.labels


@pytest.fixture(autouse=True)
def _fresh_state():
    garment_detection.reset_detection_state()
    yield
    garment_detection.reset_detection_state()


@pytest.fixture
def use_detector():
    def install(detector: FakeDetector) -> FakeDetector:
        app.dependency_overrides[get_garment_detector] = lambda: detector
        return detector

    yield install
    app.dependency_overrides[get_garment_detector] = garment_detection.NoDetector


async def _detect(client: AsyncClient, image: bytes | None = None, content_type="image/jpeg"):
    files = {"image": ("piece.jpg", image or _jpeg(), content_type)}
    return await client.post("/api/v1/garments/detect-category", files=files)


async def test_maps_the_most_confident_item_to_an_app_category(client, use_detector):
    use_detector(FakeDetector([Label("top", 0.88), Label("pants", 0.91), Label("clothing", 0.95)]))
    response = await _detect(client)
    assert response.status_code == 200
    assert response.json() == {"category": "Pants", "confidence": 0.91}


async def test_clothing_wins_over_accessories_in_the_same_photo(client, use_detector):
    # The real answer for their sample outfit photo, uploaded as a file.
    use_detector(
        FakeDetector(
            [Label("top", 0.88), Label("pants", 0.91), Label("scarf", 0.96), Label("bag", 0.95)]
        )
    )
    response = await _detect(client)
    assert response.json() == {"category": "Pants", "confidence": 0.91}


async def test_an_accessory_alone_is_still_guessed(client, use_detector):
    use_detector(FakeDetector([Label("bag", 0.94)]))
    response = await _detect(client)
    assert response.json() == {"category": "Bags", "confidence": 0.94}


async def test_low_confidence_or_unknown_labels_give_no_guess(client, use_detector):
    use_detector(FakeDetector([Label("pants", 0.4), Label("clothing", 0.99), Label("cape", 0.9)]))
    response = await _detect(client)
    assert response.json() == {"category": None, "confidence": None}


async def test_a_failed_call_gives_no_guess_not_an_error(client, use_detector):
    use_detector(FakeDetector(DetectionError("timeout")))
    response = await _detect(client)
    assert response.status_code == 200
    assert response.json()["category"] is None


async def test_the_same_photo_is_answered_from_memory(client, use_detector):
    detector = use_detector(FakeDetector([Label("dress", 0.8)]))
    image = _jpeg()
    await _detect(client, image)
    response = await _detect(client, image)
    assert response.json()["category"] == "Dresses"
    assert detector.calls == 1


async def test_detection_off_sends_nothing(client):
    # conftest installs NoDetector, as an empty FASHION_API_KEY does.
    response = await _detect(client)
    assert response.status_code == 200
    assert response.json() == {"category": None, "confidence": None}


async def test_rejects_files_that_are_not_images(client, use_detector):
    detector = use_detector(FakeDetector([Label("top", 0.9)]))
    response = await _detect(client, b"not an image", "text/plain")
    assert response.status_code == 422
    assert detector.calls == 0


async def test_daily_limit_per_user_stops_paid_calls(client, use_detector):
    detector = use_detector(FakeDetector([Label("top", 0.9)]))
    first = await _detect(client, _jpeg((0, 10, 10)))
    headers = {"X-Device-Id": first.headers["x-device-id"]}
    limit = garment_detection.DAILY_DETECTIONS_PER_USER
    for shade in range(1, limit + 1):
        files = {"image": ("piece.jpg", _jpeg((shade * 40, 10, 10)), "image/jpeg")}
        response = await client.post(
            "/api/v1/garments/detect-category", files=files, headers=headers
        )
    assert response.status_code == 200
    assert response.json()["category"] is None
    assert detector.calls == limit


async def test_a_full_server_does_not_use_up_a_users_own_tries(client, use_detector, monkeypatch):
    detector = use_detector(FakeDetector([Label("top", 0.9)]))
    limiter = garment_detection.SlidingWindowLimiter
    monkeypatch.setattr(garment_detection, "_per_user_calls", limiter(1, 3600))
    monkeypatch.setattr(garment_detection, "_all_calls", limiter(0, 3600))
    refused = await _detect(client)
    assert refused.json()["category"] is None
    assert detector.calls == 0

    # The server has room again: the user's single try is still there.
    monkeypatch.setattr(garment_detection, "_all_calls", limiter(10, 3600))
    files = {"image": ("piece.jpg", _jpeg((200, 10, 10)), "image/jpeg")}
    headers = {"X-Device-Id": refused.headers["x-device-id"]}
    response = await client.post("/api/v1/garments/detect-category", files=files, headers=headers)
    assert response.json()["category"] == "T-Shirts"
    assert detector.calls == 1


async def test_real_detector_reads_their_answer():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-rapidapi-key"] == "test-key"
        return httpx.Response(200, json=RECORDED_ANSWER)

    detector = Api4aiFashionDetector("test-key", transport=httpx.MockTransport(handler))
    labels = await detector.detect(ImageUpload(_jpeg(), "image/jpeg", "piece.jpg"))
    assert Label("pants", 0.91) in labels
    assert len(labels) == 3


async def test_real_detector_turns_bad_answers_into_detection_errors():
    detector = Api4aiFashionDetector(
        "test-key", transport=httpx.MockTransport(lambda _: httpx.Response(429, json={}))
    )
    with pytest.raises(DetectionError):
        await detector.detect(ImageUpload(_jpeg(), "image/jpeg", "piece.jpg"))
