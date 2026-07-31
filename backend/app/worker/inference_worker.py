"""Low-level adapter between a job's stored images and AIInferenceClient.
Depends only on the AIInferenceClient abstraction (injected) plus the
existing StorageService — no DB/repository knowledge at all (Interface
Segregation): this class's only job is "turn these two stored images into
one inference attempt," nothing about what a job or a garment is.
"""

import io
import logging
from dataclasses import dataclass

from PIL import Image

from app.services.storage import StorageService
from app.worker.inference_client_provider import AIInferenceClient, AIInferenceRequest

logger = logging.getLogger(__name__)

GENERIC_LOAD_FAILURE_MESSAGE = "Could not read one or more stored images for this job."


@dataclass
class InferenceAttempt:
    """Either `generated_image`/`model_name` are set (success) or
    `error_message` is (failure) — never both, never neither."""

    generated_image: Image.Image | None
    model_name: str | None
    error_message: str | None


class InferenceWorker:
    def __init__(self, inference_client: AIInferenceClient, storage: StorageService) -> None:
        self._inference_client = inference_client
        self._storage = storage

    def attempt(
        self, user_image_storage_key: str, garment_image_storage_key: str
    ) -> InferenceAttempt:
        # Loading/decoding is a separate try/except from the inference call,
        # not because it's less important to catch (a job whose storage key
        # doesn't resolve to a real file is exactly as much "this job can't
        # proceed" as CatVTON being unimplemented — found for real: a batch
        # run crashed outright on one bad storage key before this was
        # caught at all), but because its raw exception text can contain
        # server filesystem paths (STORAGE_UPLOADS_DIR's layout) that
        # InferenceJob.error_message would otherwise expose verbatim to
        # whichever guest owns the job via the existing GET endpoint — a
        # real finding from this feature's own security review. Logged in
        # full server-side; the job only ever gets a generic message back.
        try:
            user_image = Image.open(io.BytesIO(self._storage.read(user_image_storage_key)))
            garment_image = Image.open(io.BytesIO(self._storage.read(garment_image_storage_key)))
        except Exception:
            logger.exception(
                "worker: failed to load stored images (user_key=%s, garment_key=%s)",
                user_image_storage_key,
                garment_image_storage_key,
            )
            return InferenceAttempt(
                generated_image=None, model_name=None, error_message=GENERIC_LOAD_FAILURE_MESSAGE
            )

        # AIInferenceClient's own exception messages (e.g.
        # CatVTONInferenceClient's) are authored, deliberate, and safe to
        # show as-is — unlike the file-load case above, kept verbatim.
        request = AIInferenceRequest(user_image=user_image, clothing_image=garment_image)
        try:
            response = self._inference_client.infer(request)
        except Exception as exc:
            logger.info("worker: inference attempt failed: %s", exc)
            return InferenceAttempt(generated_image=None, model_name=None, error_message=str(exc))

        return InferenceAttempt(
            generated_image=response.generated_image,
            model_name=response.model_name,
            error_message=None,
        )
