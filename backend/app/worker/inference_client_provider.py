"""The one place backend/app/worker/ names a concrete AIInferenceClient
implementation, or reaches into root ai/'s code at all. Everything else in
this package depends only on the AIInferenceClient abstraction, injected —
swapping which concrete client is active means changing this one function,
nothing that calls it (requirement: "the worker must only depend on
AIInferenceClient, never directly on CatVTON").

TEMPORARY DEVELOPMENT ARRANGEMENT, not a settled architectural boundary —
see PROJECT_STATUS.md's entries for this feature for the full reasoning.
`AIInferenceClient` (ai/src/models/inference_client.py) is documented as
"entirely internal to ai/", and root ai/ has no database access of its
own — every existing caller of it runs inside ai/'s own process. This
direct import exists so the worker layer has something real to call
today, ahead of properly resolving that boundary (e.g. a real HTTP call
into ai/ once it has an inference endpoint, per docs/decisions/0004).

Root ai/'s own package is named `src` (ai/pyproject.toml's own
`known_first_party = ["src"]` already treated it that way before this
feature existed), now installed as a real, importable distribution
("virtualtryon-ai") — via `pip install ./ai` in backend's Docker image
build, and `pip install -e ./ai` in local dev — rather than resolved
through a runtime sys.path hack or a Docker volume mount. Both `backend`
and `worker` install the same package the same way, so `import src...`
resolves identically in either container and in local dev.
"""

from src.models.inference_client import (
    AIInferenceClient,
    AIInferenceRequest,
    AIInferenceResponse,
)
from src.models.inference_clients.catvton_inference_client import CatVTONInferenceClient
from src.models.inference_clients.demo_inference_client import DemoInferenceClient

from app.core.config import get_settings

__all__ = [
    "AIInferenceClient",
    "AIInferenceRequest",
    "AIInferenceResponse",
    "get_inference_client",
]


def get_inference_client() -> AIInferenceClient:
    """Chosen by the TRYON_PROVIDER setting:

    - "demo": DemoInferenceClient, which returns the user's photo with the
      garment pinned on and a visible "DEMO" banner, so the whole app flow
      can be tested before a real try-on API is connected.
    - "catvton": CatVTONInferenceClient, which always raises
      NotImplementedError, so every job fails honestly.

    Not VirtualTryOnEngineRegistry.create(): that factory defaults to
    LocalStubInferenceClient, a plain grey image with no label, which
    would look like a broken real result.
    """
    if get_settings().TRYON_PROVIDER == "demo":
        return DemoInferenceClient()
    return CatVTONInferenceClient()
