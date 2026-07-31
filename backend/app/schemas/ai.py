"""Public response contract for POST /api/v1/ai/mediapipe/analyze.

Deliberately separate from `backend/ai/models/mediapipe_analysis.py`'s
internal DTO per `docs/architecture/backend.md`'s schemas-vs-models rule —
this is what the API promises callers, not what MediaPipe/OpenCV happen to
return internally.
"""

from pydantic import BaseModel


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float | None = None


class MediaPipeLandmarks(BaseModel):
    body: list[LandmarkPoint]
    face: list[LandmarkPoint]


class MediaPipeAnalyzeResponse(BaseModel):
    success: bool
    body_detected: bool
    face_detected: bool
    landmarks: MediaPipeLandmarks
    processing_time_ms: float


class MediaPipeAnalyzeErrorResponse(BaseModel):
    success: bool = False
    error: str
