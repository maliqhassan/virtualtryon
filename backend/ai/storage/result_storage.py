"""Store a completed try-on's final image and return its persisted URI
(requirement 10). Depends on the generic storage interface planned in
docs/roadmap Milestone 2, not yet built — this is a structural stub
fixing the call shape, not a real implementation.
"""

from ..models.job import TryOnResult


async def store_result(job_id: str, result: TryOnResult) -> TryOnResult:
    """Persist `result`'s image and return a copy of `result` with
    `image_uri` pointing at its final, permanent storage location.
    """
    raise NotImplementedError(
        "storage not implemented — scope of this phase excludes inference/endpoints"
    )
