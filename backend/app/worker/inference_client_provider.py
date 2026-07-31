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

__all__ = [
    "AIInferenceClient",
    "AIInferenceRequest",
    "AIInferenceResponse",
    "get_inference_client",
]


def get_inference_client() -> AIInferenceClient:
    """Not VirtualTryOnEngineRegistry.create() — that factory defaults to
    LocalStubInferenceClient, which returns a real (if fake) placeholder
    image. Using it here would make every job "succeed" with fake
    content, which this feature's requirements explicitly forbid.
    CatVTONInferenceClient always raises NotImplementedError today, which
    is the honest behavior this worker is built to handle.
    """
    return CatVTONInferenceClient()
