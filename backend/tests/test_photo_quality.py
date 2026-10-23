"""Unit tests for the full-body rule, using a fake MediaPipe result so no
model download is needed."""

import pytest

from ai.models.mediapipe_analysis import Landmark, MediaPipeAnalysisResult
from app.services import photo_quality
from app.services.photo_quality import (
    NO_PERSON_MESSAGE,
    NOT_FULL_BODY_MESSAGE,
    MediaPipeFullBodyChecker,
    PhotoRejectedError,
)


def _result(hidden: set[int] | None = None, detected: bool = True) -> MediaPipeAnalysisResult:
    hidden = hidden or set()
    landmarks = [
        Landmark(x=0.5, y=0.5, z=0.0, visibility=0.1 if i in hidden else 0.9) for i in range(33)
    ]
    return MediaPipeAnalysisResult(
        body_detected=detected,
        face_detected=detected,
        body_landmarks=landmarks if detected else [],
        face_landmarks=[],
    )


class _FakeService:
    def __init__(self, result: MediaPipeAnalysisResult) -> None:
        self._result = result

    def analyze(self, image_bytes: bytes) -> MediaPipeAnalysisResult:
        return self._result


def _checker_with(monkeypatch: pytest.MonkeyPatch, result: MediaPipeAnalysisResult):
    monkeypatch.setattr(photo_quality, "get_mediapipe_service", lambda: _FakeService(result))
    return MediaPipeFullBodyChecker()


def test_full_body_photo_passes(monkeypatch: pytest.MonkeyPatch) -> None:
    _checker_with(monkeypatch, _result()).check(b"img")


def test_photo_without_feet_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    checker = _checker_with(monkeypatch, _result(hidden={27, 28}))
    with pytest.raises(PhotoRejectedError, match=NOT_FULL_BODY_MESSAGE):
        checker.check(b"img")


def test_photo_without_a_person_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    checker = _checker_with(monkeypatch, _result(detected=False))
    with pytest.raises(PhotoRejectedError, match=NO_PERSON_MESSAGE):
        checker.check(b"img")


def test_model_failure_accepts_the_photo(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Broken:
        def analyze(self, image_bytes: bytes) -> MediaPipeAnalysisResult:
            raise RuntimeError("model download failed")

    monkeypatch.setattr(photo_quality, "get_mediapipe_service", lambda: _Broken())
    MediaPipeFullBodyChecker().check(b"img")
