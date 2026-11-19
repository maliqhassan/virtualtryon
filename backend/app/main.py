import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.body_limit import BodySizeLimitMiddleware
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.guest_identity import DEVICE_ID_HEADER
from app.services.image_validation import MAX_UPLOAD_BYTES
from app.services.storage import StorageFullError
from app.services.upload_limits import UploadLimitReachedError

# The largest request body accepted: the most images one request carries
# (three, for a saved look) at the per-image limit, plus form fields.
_MB = 1024 * 1024
MAX_REQUEST_BYTES = 3 * MAX_UPLOAD_BYTES + _MB
_TOO_LARGE = f"This upload is too large. Each photo must be under {MAX_UPLOAD_BYTES // _MB} MB."

logger = logging.getLogger(__name__)
settings = get_settings()
configure_logging(settings.DEBUG)


def api_docs_urls(debug: bool, app_env: str, prefix: str) -> dict[str, str | None]:
    """The interactive docs and the API schema only while developing: in
    production they'd be a free map of every endpoint, and the app uses
    neither. Off when DEBUG is off, and in production even if DEBUG was
    left on by mistake."""
    if not debug or app_env == "production":
        return {"openapi_url": None, "docs_url": None, "redoc_url": None}
    return {
        "openapi_url": f"{prefix}/openapi.json",
        "docs_url": f"{prefix}/docs",
        "redoc_url": f"{prefix}/redoc",
    }


_docs = api_docs_urls(settings.DEBUG, settings.APP_ENV, settings.API_V1_PREFIX)
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    openapi_url=_docs["openapi_url"],
    docs_url=_docs["docs_url"],
    redoc_url=_docs["redoc_url"],
)

# Added before CORS so CORS wraps it, and a 413 still carries CORS headers.
app.add_middleware(BodySizeLimitMiddleware, max_bytes=MAX_REQUEST_BYTES, message=_TOO_LARGE)

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


# Raised from several services (every upload, and copies into saved looks),
# so mapped once here rather than in each endpoint.
@app.exception_handler(StorageFullError)
async def _storage_full(_: Request, exc: StorageFullError) -> JSONResponse:
    logger.error("upload refused: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
        content={"detail": "We can't store new photos right now. Please try again later."},
    )


@app.exception_handler(UploadLimitReachedError)
async def _upload_limit(_: Request, exc: UploadLimitReachedError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": str(exc)})


# Serves Saved Looks' stored images (app/services/storage/local_storage.py).
# StaticFiles requires the directory to exist before mounting.
settings.STORAGE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.STORAGE_UPLOADS_DIR)), name="uploads")


@app.get("/health", tags=["infra"])
def health_check() -> dict[str, str]:
    """Liveness probe for Docker/orchestrator health checks."""
    return {"status": "ok"}
