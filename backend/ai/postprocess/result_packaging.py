"""Assembles the workflow's final ..models.job.TryOnResult from the
enhancement stage's output (requirement 9 -> 10 boundary), right before
storage/ persists it.
"""

from ..models.enhancement import EnhancementResult
from ..models.job import TryOnResult


def package_result(enhancement: EnhancementResult) -> TryOnResult:
    raise NotImplementedError(
        "result packaging not implemented — scope of this phase excludes inference/endpoints"
    )
