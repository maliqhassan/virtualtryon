"""HTTP client for backend/ai/services/ to call into the root ai/
execution service. This is the ONLY point where backend/ai/ talks to
ai/ — always over HTTP, never a direct Python import (see
docs/decisions/0004-ai-orchestration-vs-execution-boundary.md).

No inference happens here. Every method is a thin HTTP call stub; the
bodies are not implemented (per this phase's explicit "do not implement
inference / endpoints" scope) — they exist only to fix the shape of the
orchestration <-> execution boundary so pipelines/ and workflow.py can
be written against a stable interface now, before ai/ has real
endpoints to call.

Future NVIDIA NIM migration: ai/src/core/config.py already carries a
NIM_ENDPOINT_URL placeholder (Phase 0). When ai/'s own inference is
eventually swapped for a NIM-hosted endpoint, only this client's
base_url changes — nothing in pipelines/ or workflow.py needs to know.
"""

from ..models.enhancement import EnhancementResult
from ..models.identity import IdentityPreservationResult
from ..models.parsing import HumanParsingResult
from ..models.pose import PoseDetectionResult
from ..models.tryon import TryOnGenerationInput, TryOnGenerationResult


class AIServiceClient:
    """Thin HTTP client to the root ai/ execution service.

    One method per GPU-bound stage. Each method's job is to POST the
    stage's input to ai/'s (future) HTTP API and parse the response back
    into the matching Pydantic result contract — never to compute
    anything itself.
    """

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url

    async def detect_pose(self, user_photo_uri: str) -> PoseDetectionResult:
        raise NotImplementedError(
            "ai/ has no pose endpoint yet — scope of this phase excludes inference/endpoints"
        )

    async def parse_human(self, user_photo_uri: str) -> HumanParsingResult:
        raise NotImplementedError(
            "ai/ has no parsing endpoint yet — scope of this phase excludes inference/endpoints"
        )

    async def generate_tryon(self, generation_input: TryOnGenerationInput) -> TryOnGenerationResult:
        raise NotImplementedError(
            "ai/ has no try-on endpoint yet — scope of this phase excludes inference/endpoints"
        )

    async def preserve_identity(
        self, generated_image_uri: str, source_photo_uri: str
    ) -> IdentityPreservationResult:
        raise NotImplementedError(
            "ai/ has no identity endpoint yet — scope of this phase excludes inference/endpoints"
        )

    async def enhance_image(self, image_uri: str) -> EnhancementResult:
        raise NotImplementedError(
            "ai/ has no enhancement endpoint yet — scope of this phase excludes inference/endpoints"
        )
