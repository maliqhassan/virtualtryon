"""The worker's outermost entrypoint. Two ways to invoke it — both exist so
a future queue integration (docs/decisions/0005's still-unimplemented `arq`
consumer) can dispatch a single job by id directly (`process_single_job`)
without `run_once`'s "enumerate everything queued" behavior needing to be
redesigned around it.
"""

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.inference_job_repository import InferenceJobRepository
from app.models.inference_job import InferenceJobStatus
from app.services.storage import get_storage_service
from app.worker.inference_client_provider import get_inference_client
from app.worker.inference_worker import InferenceWorker
from app.worker.job_processor import JobProcessor

logger = logging.getLogger(__name__)


@dataclass
class WorkerRunResult:
    """Structured enough for the runner (app/worker/worker_runner.py) to
    log jobs found/processed/failed as distinct numbers, without the
    runner needing any job-processing knowledge of its own — WorkerService
    computes these, the runner only logs them."""

    jobs_found: int
    jobs_processed: int
    jobs_failed: int
    jobs_completed: int


class WorkerService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        storage = get_storage_service()
        inference_worker = InferenceWorker(get_inference_client(), storage)
        self._job_processor = JobProcessor(db, inference_worker, storage)

    async def process_single_job(self, job_id: UUID) -> InferenceJobStatus | None:
        return await self._job_processor.process_single_job(job_id)

    async def run_once(self) -> WorkerRunResult:
        """Processes every currently-queued job once. Not a real
        long-running loop or scheduler itself — that's
        app/worker/worker_runner.py's job; this remains directly callable
        on its own (e.g. from a test, or a future queue consumer)."""
        job_repo = InferenceJobRepository(self._db)
        queued_jobs = await job_repo.list_queued()

        jobs_processed = 0
        jobs_failed = 0
        jobs_completed = 0
        for job in queued_jobs:
            outcome = await self.process_single_job(job.id)
            if outcome is None:
                continue
            jobs_processed += 1
            if outcome == InferenceJobStatus.FAILED:
                jobs_failed += 1
            elif outcome == InferenceJobStatus.COMPLETED:
                jobs_completed += 1

        return WorkerRunResult(
            jobs_found=len(queued_jobs),
            jobs_processed=jobs_processed,
            jobs_failed=jobs_failed,
            jobs_completed=jobs_completed,
        )
