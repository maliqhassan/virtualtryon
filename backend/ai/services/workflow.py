"""The imperative orchestrator: consumes a queued job and executes the
workflow's stages in the order pipelines/tryon_pipeline.py declares.

This is what the arq worker process
(docs/decisions/0005-async-job-processing-via-redis.md) actually calls
per job. It is orchestration only — it calls out to
services/ai_client.py for every GPU-bound step and never computes
anything itself. Declarative "what order do stages run in" lives in
pipelines/tryon_pipeline.py; this file is only the imperative "how do we
walk that order" — see that module's docstring for why the two are kept
separate.

Not implemented in this phase (no inference, no endpoints) — this is a
structural stub showing where the real orchestration loop goes once
ai_client.py and job_queue.py have real bodies.
"""

from ..models.job import TryOnJob
from .ai_client import AIServiceClient
from .job_queue import JobQueue


async def run_tryon_workflow(
    job_id: str, ai_client: AIServiceClient, job_queue: JobQueue
) -> TryOnJob:
    """Run every stage in TRYON_PIPELINE_STAGES for `job_id`, updating
    the job's status after each stage. Called by the arq worker process,
    not by the FastAPI API process (see ADR 0005).
    """
    raise NotImplementedError(
        "workflow execution not implemented — scope of this phase excludes inference/endpoints"
    )
