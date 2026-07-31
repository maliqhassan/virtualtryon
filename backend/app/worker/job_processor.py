"""Orchestrates one InferenceJob's attempted lifecycle: queued -> processing
-> failed (today; -> completed once a real AIInferenceClient exists). Ties
the job/garment repositories together with InferenceWorker's inference
attempt — calls only the existing, unchanged app/services/inference_jobs.py
functions to persist transitions; never mutates InferenceJob rows itself.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.models.inference_job import InferenceJobStatus
from app.services.inference_jobs import mark_failed, mark_processing
from app.worker.inference_worker import InferenceWorker

logger = logging.getLogger(__name__)

MISSING_GARMENT_MESSAGE = "Referenced garment no longer exists."


class JobProcessor:
    def __init__(self, db: AsyncSession, inference_worker: InferenceWorker) -> None:
        self._db = db
        self._inference_worker = inference_worker

    async def process_single_job(self, job_id: UUID) -> InferenceJobStatus | None:
        """Returns the job's resulting status, or None if there was no job
        to process at all (not found) — lets a caller (WorkerService, for
        the runner's structured logging) distinguish "attempted and
        failed" from "nothing to do here." Purely a richer return value,
        not a new responsibility or a new dependency on anything calling
        this method."""
        job_repo = InferenceJobRepository(self._db)
        job = await job_repo.get_by_id(job_id)
        if job is None:
            logger.warning("worker: job %s not found, skipping", job_id)
            return None

        # ON DELETE SET NULL (Garment deleted from Wardrobe after the job
        # was created) — a real, reachable failure mode, not a hypothetical.
        garment = None
        if job.garment_id is not None:
            garment_repo = GarmentRepository(self._db)
            garment = await garment_repo.get_by_id(job.garment_id)

        if garment is None:
            await mark_failed(self._db, job_id, error_message=MISSING_GARMENT_MESSAGE)
            return InferenceJobStatus.FAILED

        await mark_processing(self._db, job_id)

        attempt = self._inference_worker.attempt(
            user_image_storage_key=job.user_image_storage_key,
            garment_image_storage_key=garment.image_url,
        )

        if attempt.error_message is not None:
            await mark_failed(self._db, job_id, error_message=attempt.error_message)
            return InferenceJobStatus.FAILED

        # Unreachable today — the only AIInferenceClient this worker is
        # wired to (CatVTONInferenceClient) always raises. Deliberately not
        # built out further here: persisting a real generated image is
        # image-generation-pipeline territory this stage was explicitly
        # scoped not to implement. Logged, not silently dropped, so this
        # isn't mistaken for "nothing happened." Returns None (like the
        # not-found case) since no definitive outcome was actually
        # persisted — the job stays in `processing`, same as if this
        # branch didn't exist yet.
        logger.info(
            "worker: job %s got a real inference result (unexpected — no real "
            "AIInferenceClient exists yet); not persisted, see job_processor.py",
            job_id,
        )
        return None
