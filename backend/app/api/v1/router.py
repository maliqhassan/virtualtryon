from fastapi import APIRouter

from app.api.v1.endpoints import ai, garments, inference_jobs, profile, saved_looks, user_photos

api_router = APIRouter()
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(saved_looks.router, prefix="/saved-looks", tags=["saved-looks"])
api_router.include_router(garments.router, prefix="/garments", tags=["garments"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(inference_jobs.router, prefix="/inference-jobs", tags=["inference-jobs"])
api_router.include_router(user_photos.router, prefix="/user-photos", tags=["user-photos"])
