"""HTTP layer for the AI inference job pipeline's Stage 1. Routing,
request parsing, and status-code mapping only — real logic lives in
app/services/inference_jobs.py.

Deliberately only GET/POST. No PATCH, no DELETE: status transitions are
service-layer-only operations for a future worker to call directly, never
a guest-facing HTTP surface (docs/decisions/0008-inference-job-persistence.md).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.inference_job import CreateInferenceJobRequest, InferenceJobResponse
from app.services.inference_jobs import (
    InferenceJobNotFoundError,
    InvalidGarmentReferenceError,
    NoUserPhotoError,
    create_inference_job,
    get_inference_job,
    list_inference_jobs,
)
from app.services.usage import UsageLimitReachedError

router = APIRouter()


@router.get("", response_model=list[InferenceJobResponse])
async def list_all_inference_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[InferenceJobResponse]:
    return await list_inference_jobs(db=db, user_id=current_user.id)


@router.post("", response_model=InferenceJobResponse, status_code=status.HTTP_201_CREATED)
async def create_new_inference_job(
    payload: CreateInferenceJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InferenceJobResponse:
    try:
        return await create_inference_job(db=db, user_id=current_user.id, payload=payload)
    except InvalidGarmentReferenceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InferenceJobNotFoundError as exc:  # the caller's user row vanished mid-request
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except NoUserPhotoError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UsageLimitReachedError as exc:
        # 402 so the app can tell "upgrade needed" apart from other errors
        # and open the upgrade screen.
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": str(exc), "usage": exc.usage.model_dump(mode="json")},
        ) from exc


@router.get("/{job_id}", response_model=InferenceJobResponse)
async def get_one_inference_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InferenceJobResponse:
    try:
        return await get_inference_job(db=db, user_id=current_user.id, job_id=job_id)
    except InferenceJobNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
