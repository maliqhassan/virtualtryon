"""Orchestrates one InferenceJob's attempted lifecycle: queued -> processing
-> completed (generated image stored) or failed. Ties
the job/garment repositories together with InferenceWorker's inference
attempt — calls only the existing, unchanged app/services/inference_jobs.py
functions to persist transitions; never mutates InferenceJob rows itself.
"""

import asyncio
import io
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.models.inference_job import InferenceJobStatus
from app.services.clothing import resolve_job_clothing
from app.services.inference_jobs import (
    InferenceJobNotFoundError,
    mark_completed_unless_redacted,
    mark_failed,
    mark_processing,
)
from app.services.storage import StorageService
from app.services.usage import STALE_JOB_AFTER
from app.worker.inference_worker import InferenceWorker

logger = logging.getLogger(__name__)

MISSING_GARMENT_MESSAGE = "Referenced garment no longer exists."
SAVE_FAILURE_MESSAGE = "The result couldn't be saved. Please try again."
DATA_DELETED_MESSAGE = "Your data was deleted while this try-on was running."
STALE_JOB_MESSAGE = "This try-on waited too long to start, so it was cancelled. It wasn't counted."
STUCK_JOB_MESSAGE = (
    "This try-on was interrupted, probably by a server restart. It wasn't counted. "
    "Please try again."
)
# Longer than any real try-on: VTON-D's call times out after 90 s of silence,
# and a Genlook try-on has a 200 s deadline for everything (ai/src/models/
# inference_clients/). Keep it above both, or slow paid try-ons get failed.
PROCESSING_TIMEOUT = timedelta(minutes=5)


class JobProcessor:
    def __init__(
        self,
        db: AsyncSession,
        inference_worker: InferenceWorker,
        storage: StorageService,
    ) -> None:
        self._db = db
        self._inference_worker = inference_worker
        self._storage = storage

    async def fail_stuck_jobs(self) -> int:
        """Fails every try-on that has been `processing` for longer than any
        real one takes, and returns how many. Run at the start of each pass,
        so a try-on cut off by a deploy or crash, or stuck on a call that
        never returns, is failed within PROCESSING_TIMEOUT instead of waiting
        forever. Time-based rather than "everything at startup", so it's also
        safe if two workers ever run at once. A failed try-on isn't counted,
        and the app offers Try again."""
        now = datetime.now(UTC)
        return await InferenceJobRepository(self._db).fail_processing_started_before(
            now - PROCESSING_TIMEOUT, STUCK_JOB_MESSAGE, failed_at=now
        )

    async def process_single_job(self, job_id: UUID) -> InferenceJobStatus | None:
        """See _process. A job that disappears while it runs (its account was
        deleted, ADR 0015) ends as None, "nothing to do", not an error."""
        try:
            return await self._process(job_id)
        except InferenceJobNotFoundError:
            logger.info("worker: job %s was deleted while it ran", job_id)
            return None

    async def _process(self, job_id: UUID) -> InferenceJobStatus | None:
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

        # A job left queued past STALE_JOB_AFTER (e.g. the worker was down)
        # already stopped counting against the user's allowance, so running
        # it now would be a free try-on. Cancel it instead.
        created_at = job.created_at if job.created_at.tzinfo else job.created_at.replace(tzinfo=UTC)
        if (
            job.status == InferenceJobStatus.QUEUED
            and created_at < datetime.now(UTC) - STALE_JOB_AFTER
        ):
            await mark_failed(self._db, job_id, error_message=STALE_JOB_MESSAGE)
            return InferenceJobStatus.FAILED

        # The garment may have been deleted from the wardrobe (or the product
        # removed from the catalogue) after the job was created: ON DELETE
        # SET NULL makes this a real, reachable failure mode.
        clothing = await resolve_job_clothing(self._db, job)
        if clothing is None:
            await mark_failed(self._db, job_id, error_message=MISSING_GARMENT_MESSAGE)
            return InferenceJobStatus.FAILED

        await mark_processing(self._db, job_id)

        # In a thread: a real provider takes seconds over the network, and
        # the demo's image work is CPU-bound; neither should hold the loop.
        attempt = await asyncio.to_thread(
            self._inference_worker.attempt,
            user_image_storage_key=job.user_image_storage_key,
            garment_image_storage_key=clothing.image_url,
            garment_title=clothing.title,
            garment_category=clothing.category,
        )

        if attempt.error_message is not None:
            await mark_failed(self._db, job_id, error_message=attempt.error_message)
            return InferenceJobStatus.FAILED

        if attempt.generated_image is None:  # unreachable: InferenceAttempt sets one or the other
            await mark_failed(self._db, job_id, error_message=SAVE_FAILURE_MESSAGE)
            return InferenceJobStatus.FAILED

        try:
            buffer = io.BytesIO()
            attempt.generated_image.save(buffer, format="PNG")
            generated_image_url = self._storage.save(buffer.getvalue(), "png")
        except Exception:
            logger.exception("worker: failed to store generated image for job %s", job_id)
            await mark_failed(self._db, job_id, error_message=SAVE_FAILURE_MESSAGE)
            return InferenceJobStatus.FAILED

        # The user may have deleted their data while this job was running
        # (their image references get redacted). The completion is a single
        # conditional UPDATE, so no new image of them is ever kept after that.
        # It also does nothing if the job was already failed as stuck
        # (fail_stuck_jobs); that failure, and its message, stand.
        if not await mark_completed_unless_redacted(self._db, job_id, generated_image_url):
            self._storage.delete(generated_image_url)
            status = await job_repo.get_status(job_id)
            if status is None:  # the whole account was deleted meanwhile
                return None
            if status != InferenceJobStatus.FAILED:
                await mark_failed(self._db, job_id, error_message=DATA_DELETED_MESSAGE)
            return InferenceJobStatus.FAILED
        logger.info("worker: job %s completed (model=%s)", job_id, attempt.model_name)
        return InferenceJobStatus.COMPLETED
