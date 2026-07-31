"""Declarative pipeline definition: what stages run, and in what order,
for a try-on job. This module owns the ONLY ordering of WorkflowStage
values in backend/ai/ — models/job.py deliberately does not duplicate an
ordered list, only the stage set (WorkflowStage) and count
(len(WorkflowStage)), so the two can never drift apart.

This is declarative composition, mirroring root ai/src/pipelines/'s role
one level up (composing model calls into a pipeline) — but at the
orchestration level, composing workflow *stages* rather than model
calls. Same word, different layer: see
docs/decisions/0004-ai-orchestration-vs-execution-boundary.md if that
reads as duplication at first glance.

services/workflow.py is the imperative counterpart that actually walks
this list and calls out to services/ai_client.py per stage.
"""

from ..models.job import WorkflowStage

TRYON_PIPELINE_STAGES: tuple[WorkflowStage, ...] = (
    WorkflowStage.VALIDATING,
    WorkflowStage.POSE_DETECTION,
    WorkflowStage.HUMAN_PARSING,
    WorkflowStage.VIRTUAL_TRYON,
    WorkflowStage.IDENTITY_PRESERVATION,
    WorkflowStage.ENHANCEMENT,
    WorkflowStage.STORING,
)
