"""Where a real CatVTON implementation connects.

Not wired into `engine_registry.py` by default — `LocalStubInferenceClient`
is, until this is real. Writing this class's real body and switching
`CatVTONEngine`'s injected dependency to it is the entire integration step
once that work is scoped and approved; nothing about `CatVTONEngine`,
`VirtualTryOnEngine`, or any caller changes.
"""

from ..inference_client import AIInferenceClient, AIInferenceRequest, AIInferenceResponse


class CatVTONInferenceClient(AIInferenceClient):
    """Not implemented. Real CatVTON integration needs, in order:

    TODO: load model weights — CatVTON's checkpoint (`zhengchong/CatVTON`
    on Hugging Face Hub, CC-BY-NC-SA 4.0 — non-commercial, verify licensing
    fit before any commercial use) plus its model code, which isn't
    pip-installable and needs vendoring into this codebase per that
    license's attribution/share-alike terms. Cache location:
    `ai/src/core/config.py`'s `MODEL_CACHE_DIR`.

    TODO: GPU inference — device/precision selection
    (`ai/src/core/config.py`'s `DEVICE` setting), batch size 1, ~8GB VRAM
    per CatVTON's own published requirements at 1024x768 (bf16).

    TODO: external inference server — alternatively, `infer()` could POST
    to a dedicated GPU microservice or an NVIDIA NIM-hosted endpoint
    instead of loading the model in this process, mirroring the
    `NIM_ENDPOINT_URL` placeholder already in `ai/src/core/config.py`.
    Either path is valid behind this same `AIInferenceClient` interface —
    the choice doesn't affect `CatVTONEngine` or anything above it.
    """

    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        raise NotImplementedError(
            "CatVTON inference is not implemented — see this class's docstring for the "
            "three TODOs (model weights, GPU inference, external inference server) that "
            "need resolving before this can run for real"
        )
