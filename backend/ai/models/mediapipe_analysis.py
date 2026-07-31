"""Internal contract for the MediaPipe diagnostic analysis feature.

Deliberately separate from `pose.py`'s `PoseDetectionResult`: that contract is
reserved for the future job-pipeline `POSE_DETECTION` stage (body keypoints
only, no detection flags, no face data). This one backs the standalone
`POST /api/v1/ai/mediapipe/analyze` diagnostic endpoint (see ADR 0007), which
needs both body and face landmarks plus explicit detected/not-detected flags
in one response.
"""

from pydantic import BaseModel


class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float | None = None  # body landmarks only; MediaPipe leaves this unset for face


class MediaPipeAnalysisResult(BaseModel):
    body_detected: bool
    face_detected: bool
    body_landmarks: list[Landmark]
    face_landmarks: list[Landmark]
