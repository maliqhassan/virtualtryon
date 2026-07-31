"""Data contracts for the try-on job lifecycle.

`WorkflowStage` enumerates the workflow's real stages — requirements 3 and
5-10 from the architecture brief ("Upload User/Clothing Image" happen
before a job exists, as separate endpoints per docs/roadmap Milestones 2/3;
"Background Processing", requirement 4, is the async mechanism itself —
see docs/decisions/0005 — not a discrete stage). The stage *order* lives in
pipelines/tryon_pipeline.py, not here — this module owns what a stage IS,
not what sequence they run in.

Mirrors, and is meant to satisfy, the contract the frontend already mocks
(frontend/src/features/tryon/types.ts's TryOnJob/TryOnResult) — the real
backend fulfills a shape the client was already built against, not the
other way around.

One honest gap, stated rather than glossed over: the frontend's mock uses
3 flavor-text step ids ("reading_measurements", "draping_fabric",
"matching_light") standing in for a simplified 3-beat animation. The real
7-stage enum below is more granular and technically accurate, so the
frontend's step-label mapping will need updating — not just its data
source — once this is wired to something real. That swap is not perfectly
seamless, unlike the result image itself (see TryOnResult below).
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TryOnJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowStage(str, Enum):
    """One value per real pipeline stage. See module docstring for the
    requirement-number mapping; see pipelines/tryon_pipeline.py for the
    order they run in."""

    VALIDATING = "validating"
    POSE_DETECTION = "pose_detection"
    HUMAN_PARSING = "human_parsing"
    VIRTUAL_TRYON = "virtual_tryon"
    IDENTITY_PRESERVATION = "identity_preservation"
    ENHANCEMENT = "enhancement"
    STORING = "storing"


class TryOnJobCreate(BaseModel):
    """Internal creation contract — not the public API request schema
    (that's `app/schemas/`, once it exists). This is what
    `services/workflow.py` needs to start a job."""

    user_id: str
    user_photo_id: str
    garment_id: str


class TryOnResult(BaseModel):
    """Mirrors frontend/src/features/tryon/types.ts's TryOnResult in
    *shape* (a nullable image URI, an is-mock flag, optional reasoning)
    — this is the seam: a real backend populating a real image URI
    requires zero frontend logic changes, since it already branches on
    that field being present or not.

    Field *names* are not expected to match wire-for-wire: this is an
    internal contract (Python/snake_case, e.g. `image_uri`), not the
    public API response (TypeScript/camelCase, e.g. `imageUri`). No
    case-translation layer exists yet anywhere in this project — that's
    `app/schemas/`'s job (e.g. Pydantic `alias_generator`) once it's
    built, at the `app/api/v1/` boundary. Not this module's concern."""

    image_uri: str | None = None
    is_mock: bool = False
    reasoning: str | None = None


class TryOnJob(BaseModel):
    id: str
    status: TryOnJobStatus
    stage: WorkflowStage | None = None
    stage_index: int = -1
    stage_count: int = len(WorkflowStage)
    progress: int = Field(default=0, ge=0, le=100)
    error_message: str | None = None
    completed_at: datetime | None = None
    result: TryOnResult | None = None
