"""Redis-backed job queue: the producer/status-reader side of async job
processing (docs/decisions/0005-async-job-processing-via-redis.md). This
module enqueues work and reads status — it is NOT the worker that
consumes the queue and runs stages; that worker is a separate
process/container (see docs/architecture/ai-backend.md).

Built on `arq` (chosen in ADR 0005). `arq` is not yet added to
backend/requirements.txt — per this project's add-it-when-first-used
convention (docs/roadmap/README.md's "Dependencies" section; the same
principle is applied explicitly to frontend deps in
design/react-native/04-inconsistencies-and-recommendations.md), and this
phase implements no real usage. The methods below are
structural stubs fixing the shape of the producer interface so
services/workflow.py and the future API layer can be written against it
now.
"""

from ..models.job import TryOnJob, TryOnJobCreate


class JobQueue:
    """Producer/status-reader for the Redis-backed try-on job queue.

    A real implementation wraps an `arq.connections.ArqRedis` pool:
    `enqueue` calls `redis.enqueue_job("run_tryon_workflow", job_id)`,
    and `get_status` reads the job's current TryOnJob state. Where that
    state itself lives (Redis hash vs. a Postgres row updated per stage)
    is an open question — see docs/architecture/ai-backend.md.
    """

    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url

    async def enqueue(self, job: TryOnJobCreate) -> str:
        raise NotImplementedError(
            "arq not yet wired up — scope of this phase excludes implementation"
        )

    async def get_status(self, job_id: str) -> TryOnJob:
        raise NotImplementedError(
            "arq not yet wired up — scope of this phase excludes implementation"
        )
