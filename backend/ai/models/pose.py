"""Contract for the pose detection stage (requirement 5).

Populated by whichever pose model `ai/` eventually runs (MediaPipe or
DWPose — the specific choice between them is deliberately not made here;
see "Future models" in docs/architecture/ai-backend.md). Keypoints use a
generic named-point structure rather than a model-specific format, so
switching between MediaPipe's and DWPose's differing keypoint schemas is a
mapping concern inside `ai/`, not something that changes this contract.
"""

from pydantic import BaseModel


class PoseKeypoint(BaseModel):
    name: str  # e.g. "left_shoulder" — generic, not tied to one model's own naming scheme
    x: float
    y: float
    confidence: float


class PoseDetectionResult(BaseModel):
    keypoints: list[PoseKeypoint]
    overall_confidence: float
