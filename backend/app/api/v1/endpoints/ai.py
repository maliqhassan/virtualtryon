"""HTTP layer for the MediaPipe diagnostic analysis feature.

Routing, request parsing, and status-code mapping only — the real logic
lives in app/services/mediapipe_analysis.py (kept framework-agnostic per
this repo's layering rule).
"""

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from ai.services.mediapipe_service import ImageDecodeError
from app.schemas.ai import MediaPipeAnalyzeResponse
from app.services.mediapipe_analysis import UnsupportedImageError, analyze_image

router = APIRouter()


@router.post("/mediapipe/analyze", response_model=MediaPipeAnalyzeResponse)
async def analyze_mediapipe(file: UploadFile = File(...)) -> MediaPipeAnalyzeResponse:
    image_bytes = await file.read()

    try:
        # analyze_image is sync and CPU-bound (and, on a cold model cache,
        # does a real ~30MB network download) — run_in_threadpool keeps it
        # off the event loop so one slow request doesn't stall every other
        # concurrent request on this process.
        return await run_in_threadpool(
            analyze_image, content_type=file.content_type, image_bytes=image_bytes
        )
    except UnsupportedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    except ImageDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MediaPipe analysis failed unexpectedly",
        ) from exc
