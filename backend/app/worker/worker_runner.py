"""Executes WorkerService.run_once() on a repeating interval — gives the
worker layer (Sprint 4 Stage 5) somewhere to actually run. Has zero
job-processing knowledge of its own: it only ever calls WorkerService and
logs the structured result. WorkerService has no knowledge of this file at
all — a one-way dependency, by design ("keep WorkerService completely
independent from the runner").

Not wired into Redis/arq yet (docs/decisions/0005's still-separately-
scoped future work) — a plain polling loop, run as its own OS process (see
docker-compose.yml's `worker` service and app/worker/__main__.py), not
FastAPI's BackgroundTasks (ADR 0005 already ruled that out: "not FastAPI's
BackgroundTasks... which is exactly what ADR 0002 already said not to
couple").
"""

import asyncio
import contextlib
import logging
import time

from app.db.session import AsyncSessionLocal
from app.worker.worker_service import WorkerService

logger = logging.getLogger(__name__)


class WorkerRunner:
    """Repeatedly calls WorkerService.run_once(), sleeping
    `poll_interval_seconds` between iterations. `request_shutdown()` (or a
    registered OS signal handler calling it) stops the loop after the
    current iteration finishes — never mid-iteration, so a shutdown never
    leaves a job stranded in `processing`. The sleep itself is
    interruptible, so a shutdown request doesn't wait out a potentially
    long poll interval either.
    """

    def __init__(self, poll_interval_seconds: float) -> None:
        self._poll_interval_seconds = poll_interval_seconds
        self._shutdown_event = asyncio.Event()

    def request_shutdown(self) -> None:
        self._shutdown_event.set()

    async def run(self) -> None:
        logger.info("worker runner starting (poll_interval=%.1fs)", self._poll_interval_seconds)
        while not self._shutdown_event.is_set():
            await self._run_iteration()
            if self._shutdown_event.is_set():
                break
            await self._sleep_or_shutdown()
        logger.info("worker runner stopped")

    async def _run_iteration(self) -> None:
        started_at = time.monotonic()
        try:
            async with AsyncSessionLocal() as db:
                result = await WorkerService(db).run_once()
            elapsed_seconds = time.monotonic() - started_at
            logger.info(
                "worker iteration complete: jobs_found=%d jobs_processed=%d "
                "jobs_failed=%d jobs_completed=%d elapsed_seconds=%.3f",
                result.jobs_found,
                result.jobs_processed,
                result.jobs_failed,
                result.jobs_completed,
                elapsed_seconds,
            )
        except Exception:
            elapsed_seconds = time.monotonic() - started_at
            # Recover from unexpected exceptions without terminating — a
            # single bad iteration (a transient DB hiccup, an unforeseen
            # bug) must not kill the whole runner process.
            logger.exception(
                "worker iteration failed unexpectedly after elapsed_seconds=%.3f — "
                "continuing to the next iteration",
                elapsed_seconds,
            )

    async def _sleep_or_shutdown(self) -> None:
        # TimeoutError (no shutdown requested within the interval) is the
        # normal case, not an error — suppressed, not logged.
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self._shutdown_event.wait(), timeout=self._poll_interval_seconds)
