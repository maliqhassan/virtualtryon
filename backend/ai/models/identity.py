"""Contract for the identity preservation stage (requirement 8) —
InstantID/PuLID's eventual output (the specific choice between them is
deliberately not made here; see "Future models" in
docs/architecture/ai-backend.md). Generation models can drift a generated
face away from the source photo; this stage corrects that, taking the
try-on stage's output and the original photo as input.
"""

from pydantic import BaseModel


class IdentityPreservationResult(BaseModel):
    corrected_image_uri: str
    similarity_score: float = 0.0  # how closely the corrected face matches the source photo, 0-1
