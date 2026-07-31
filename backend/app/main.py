from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.guest_identity import DEVICE_ID_HEADER

settings = get_settings()
configure_logging(settings.DEBUG)

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

app.add_middleware(
    CORSMiddleware,
    # .rstrip("/"): pydantic's AnyHttpUrl normalizes a bare host into
    # "http://host:port/" (trailing slash), but a browser's real Origin
    # header never has one — CORSMiddleware does an exact string match, so
    # without stripping this, no real cross-origin request could ever
    # match, silently, since Phase 0. Found via an actual browser request
    # while building the Saved Looks History screen — the first time
    # anything exercised this path for real.
    allow_origins=[str(origin).rstrip("/") for origin in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # allow_headers governs which *request* headers the browser may send;
    # it says nothing about *response* headers JS is allowed to read back.
    # Without this, browser JS can never see X-Device-Id even though it's
    # on the wire (visible to curl/devtools) — every web request looked
    # like a brand-new anonymous guest. Found verifying Wardrobe's web
    # rename/delete flow (PATCH/DELETE by id 404ing against the wrong
    # guest); equally affects Saved Looks' rename/favourite/delete on web.
    expose_headers=[DEVICE_ID_HEADER],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Serves Saved Looks' stored images (app/services/storage/local_storage.py).
# StaticFiles requires the directory to exist before mounting.
settings.STORAGE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.STORAGE_UPLOADS_DIR)), name="uploads")


@app.get("/health", tags=["infra"])
def health_check() -> dict[str, str]:
    """Liveness probe for Docker/orchestrator health checks."""
    return {"status": "ok"}
