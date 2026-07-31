"""Contract for the AI-readiness validation stage (requirement 3).

Distinct from the basic upload validation already planned in
docs/roadmap Milestone 2 (file type/size, MIME sniffing) — that happens
at upload time, before an image is even associated with a try-on job.
This validates that an already-uploaded image is actually usable *by the
pipeline*: is a person detectable, is the resolution sufficient, is the
image the right orientation.

Some of these checks (e.g. "is a person detectable") technically need a
lightweight model themselves — in practice this overlaps with what pose
detection also determines, and a production implementation may fold this
check into the pose-detection stage rather than running it twice. Kept as
its own contract regardless, since the workflow requirement asks for a
distinct validation step, and a fast CPU-only subset (resolution, aspect
ratio, file integrity) is real, useful, and genuinely separable from pose
detection either way.
"""

from pydantic import BaseModel


class ImageValidationResult(BaseModel):
    is_valid: bool
    failure_reason: str | None = None
    width: int | None = None
    height: int | None = None
