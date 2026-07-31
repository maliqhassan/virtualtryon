"""The AI-inference abstraction: how a VirtualTryOnEngine actually gets its
generation work done, decoupled from the engine's own business logic.

`VirtualTryOnEngine` (virtual_tryon_engine.py) answers "which model produces
the try-on image" (IDM-VTON vs. CatVTON — ADR 0006). `AIInferenceClient`
answers a different question underneath that: "how does the active engine
actually run its model" — a local in-process model, a call to an external
GPU inference server, or (today) a deterministic development stub. Engines
depend on this abstraction via constructor injection, never on a concrete
inference mechanism directly — the same Dependency Inversion pattern this
codebase already uses for `AIServiceClient`/`JobQueue`/`MediaPipeService`.

Not to be confused with `backend/ai/services/ai_client.py`'s
`AIServiceClient`: that's `backend/`'s HTTP client for calling *out* to this
`ai/` service. This `AIInferenceClient` is entirely internal to `ai/` — how
an engine *inside* this service gets its own inference done. Similar names,
different layers.

No inference happens here — this is the interface plus its request/response
shapes. See `inference_clients/` for concrete implementations.
"""

from abc import ABC, abstractmethod

from PIL import Image
from pydantic import BaseModel, ConfigDict


class AIInferenceRequest(BaseModel):
    """Whatever a VirtualTryOnEngine needs a concrete inference backend to
    act on. Deliberately mirrors `VirtualTryOnEngine.generate()`'s own
    two-image signature — nothing engine-specific (no CatVTON- or
    IDM-VTON-only fields) belongs here; that stays each engine's own
    constructor-injected concern per `virtual_tryon_engine.py`'s docstring.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    user_image: Image.Image
    clothing_image: Image.Image


class AIInferenceResponse(BaseModel):
    """Raw result of one `AIInferenceClient.infer()` call.

    Deliberately not merged with `dto.py`'s `VirtualTryOnResult`, even
    though today's shape is identical: this is the inference-backend-level
    result; `VirtualTryOnResult` is the engine-level result. They coincide
    now, but a future engine doing its own postprocessing on top of raw
    inference (e.g. blending, cropping) could make them diverge — keeping
    them separate costs nothing today and avoids coupling the two layers
    together if that day comes.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    generated_image: Image.Image
    model_name: str
    inference_time_seconds: float | None = None


class AIInferenceClient(ABC):
    """One method, deliberately (Interface Segregation, matching
    `VirtualTryOnEngine`'s own single-method minimalism): given a request,
    return a response. Nothing about *how* — local model, remote HTTP
    inference server, or a stub — is visible to a caller holding this
    abstraction.
    """

    @abstractmethod
    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        """Run inference. Concrete implementations do the actual work;
        this method has no body here by design."""
        raise NotImplementedError
