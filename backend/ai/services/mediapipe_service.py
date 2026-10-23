"""MediaPipe pose + face landmark detection (ADR 0007's narrow exception to
ADR 0004 — this is the one model that runs in-process inside `backend/ai/`
instead of over HTTP to root `ai/`; see that ADR for why).

Model loading happens once, lazily, on first `analyze()` call, and is reused
for every request after that — MediaPipe's Tasks API landmarker objects are
expensive to construct (they load a `.task` model bundle into memory) but
cheap to reuse across calls.

`model_dir` is injected by the caller (see
`app/services/mediapipe_analysis.py`) rather than read from `app.core.config`
here, matching this folder's existing pattern (`AIServiceClient(base_url)`,
`JobQueue(redis_url)`) of constructor-injected config over a direct import.

Kept to this one file/class so a future swap (e.g. DWPose for body pose, per
`docs/roadmap/ai-model-integration-roadmap.md`'s named alternative) means a
new class implementing the same `analyze()` shape, not a rewrite of this
module's callers (requirement 8: "keep the service modular for future
replacement").

Note: MediaPipe's Tasks API (`mediapipe.tasks.python.vision`) has changed
shape across versions in the past (it superseded the older
`mp.solutions.pose` / `mp.solutions.face_mesh` API). This targets the Tasks
API surface as of `mediapipe>=0.10`, pinned in requirements.txt — verify
against the installed version's own docs if these imports ever fail, the same
caveat this repo already gives for Expo SDK drift.
"""

import logging
import threading
import urllib.request
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from ..models.mediapipe_analysis import Landmark, MediaPipeAnalysisResult

logger = logging.getLogger(__name__)

# Google-hosted, public, Apache-2.0 model bundles — no auth/token needed
# (unlike ai/'s Hugging Face weights, which do need HF_TOKEN). Verify these
# URLs against MediaPipe's current Pose/Face Landmarker guide if a download
# ever 404s; Google has moved model-zoo paths before.
_POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
_FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/latest/face_landmarker.task"
)


# Multiclass selfie segmenter: 0 = background, 1-5 = hair/body/face/clothes/
# accessories. Used to cut the person out of their photo (plain background).
_SEGMENTER_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/"
    "selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
)


class ImageDecodeError(ValueError):
    """Raised when the uploaded bytes aren't a decodable image."""


class MediaPipeService:
    def __init__(self, model_dir: Path) -> None:
        self._model_dir = model_dir
        self._pose_landmarker: mp_vision.PoseLandmarker | None = None
        self._face_landmarker: mp_vision.FaceLandmarker | None = None
        self._load_lock = threading.Lock()
        # MediaPipe Tasks landmarkers aren't thread-safe; uploads run the
        # full-body check in worker threads, so detection is serialized.
        self._detect_lock = threading.Lock()
        self._segmenter: mp_vision.ImageSegmenter | None = None

    def _ensure_model_file(self, url: str, dest: Path) -> Path:
        if dest.exists():
            return dest
        dest.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading MediaPipe model bundle to %s", dest)
        tmp = dest.with_suffix(".tmp")
        urllib.request.urlretrieve(
            url, tmp
        )  # noqa: S310 -- fixed, hardcoded Google-hosted URL, not user input
        tmp.rename(dest)
        return dest

    def _ensure_loaded(self) -> tuple[mp_vision.PoseLandmarker, mp_vision.FaceLandmarker]:
        if self._pose_landmarker is not None and self._face_landmarker is not None:
            return self._pose_landmarker, self._face_landmarker

        with self._load_lock:
            if self._pose_landmarker is not None and self._face_landmarker is not None:
                return self._pose_landmarker, self._face_landmarker

            pose_model_path = self._ensure_model_file(
                _POSE_MODEL_URL, self._model_dir / "pose_landmarker_lite.task"
            )
            face_model_path = self._ensure_model_file(
                _FACE_MODEL_URL, self._model_dir / "face_landmarker.task"
            )

            logger.info("Loading MediaPipe Pose/Face Landmarker models into memory")
            self._pose_landmarker = mp_vision.PoseLandmarker.create_from_options(
                mp_vision.PoseLandmarkerOptions(
                    base_options=mp_python.BaseOptions(model_asset_path=str(pose_model_path)),
                    running_mode=mp_vision.RunningMode.IMAGE,
                )
            )
            self._face_landmarker = mp_vision.FaceLandmarker.create_from_options(
                mp_vision.FaceLandmarkerOptions(
                    base_options=mp_python.BaseOptions(model_asset_path=str(face_model_path)),
                    running_mode=mp_vision.RunningMode.IMAGE,
                )
            )
            logger.info("MediaPipe models loaded")

        return self._pose_landmarker, self._face_landmarker

    @staticmethod
    def _decode_image(image_bytes: bytes) -> mp.Image:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if bgr is None:
            raise ImageDecodeError("Uploaded file is not a decodable image")
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    def analyze(self, image_bytes: bytes) -> MediaPipeAnalysisResult:
        """Run both detectors against a single image.

        Raises `ImageDecodeError` for unreadable input. Any other exception
        is a genuine MediaPipe/runtime failure and is left unwrapped so the
        caller (`app/services/mediapipe_analysis.py`) can log the real cause
        before translating it into an HTTP response.

        Decodes before loading the models on purpose: decoding is pure
        OpenCV and needs no model, so garbage input fails fast without
        triggering a model download/load first.
        """
        mp_image = self._decode_image(image_bytes)
        pose_landmarker, face_landmarker = self._ensure_loaded()

        with self._detect_lock:
            pose_result = pose_landmarker.detect(mp_image)
            face_result = face_landmarker.detect(mp_image)

        body_landmarks = [
            Landmark(x=lm.x, y=lm.y, z=lm.z, visibility=lm.visibility)
            for lm in (pose_result.pose_landmarks[0] if pose_result.pose_landmarks else [])
        ]
        face_landmarks = [
            Landmark(x=lm.x, y=lm.y, z=lm.z)
            for lm in (face_result.face_landmarks[0] if face_result.face_landmarks else [])
        ]

        return MediaPipeAnalysisResult(
            body_detected=len(body_landmarks) > 0,
            face_detected=len(face_landmarks) > 0,
            body_landmarks=body_landmarks,
            face_landmarks=face_landmarks,
        )

    def _ensure_segmenter(self) -> mp_vision.ImageSegmenter:
        if self._segmenter is not None:
            return self._segmenter
        with self._load_lock:
            if self._segmenter is None:
                model_path = self._ensure_model_file(
                    _SEGMENTER_MODEL_URL, self._model_dir / "selfie_multiclass_256x256.tflite"
                )
                self._segmenter = mp_vision.ImageSegmenter.create_from_options(
                    mp_vision.ImageSegmenterOptions(
                        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
                        running_mode=mp_vision.RunningMode.IMAGE,
                        output_category_mask=True,
                    )
                )
                logger.info("MediaPipe image segmenter loaded")
        return self._segmenter

    def person_mask(self, image_bytes: bytes) -> "np.ndarray[Any, np.dtype[np.bool_]]":
        """A (height, width) boolean mask: True where the photo shows the person.

        Raises `ImageDecodeError` for unreadable input."""
        mp_image = self._decode_image(image_bytes)
        segmenter = self._ensure_segmenter()
        with self._detect_lock:
            result = segmenter.segment(mp_image)
        categories = result.category_mask.numpy_view()
        # The mask comes back as (height, width, 1); flatten to (height, width).
        return np.asarray(np.squeeze(categories) != 0)
