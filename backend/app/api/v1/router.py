from fastapi import APIRouter

from app.api.v1.endpoints import ai, garments, saved_looks

api_router = APIRouter()
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(saved_looks.router, prefix="/saved-looks", tags=["saved-looks"])
api_router.include_router(garments.router, prefix="/garments", tags=["garments"])
