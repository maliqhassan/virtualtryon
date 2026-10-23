from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central app configuration, loaded from environment variables / .env.

    Values have no defaults for anything environment-specific (DB, Redis,
    secrets) so a missing .env fails fast at startup instead of silently
    falling back to a dev value in production.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "VirtualTryOn API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: PostgresDsn
    # Not used by any code path yet (the worker polls Postgres; ADR 0005's
    # Redis queue isn't built), so a default is safe and hosts like Render
    # don't need a Redis instance just to boot.
    REDIS_URL: RedisDsn = RedisDsn("redis://localhost:6379/0")

    SECRET_KEY: str
    CORS_ORIGINS: list[AnyHttpUrl] = []

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def use_async_driver(cls, value: object) -> object:
        """Hosts such as Render hand out `postgres://` / `postgresql://` URLs;
        the app talks to Postgres through asyncpg."""
        if isinstance(value, str):
            for prefix in ("postgres://", "postgresql://"):
                if value.startswith(prefix):
                    return "postgresql+asyncpg://" + value[len(prefix) :]
        return value

    # Local cache dir for MediaPipe's downloaded .task model bundles (ADR
    # 0007). Not environment-sensitive like DB/Redis/secrets above, so a
    # default is safe here — a missing value just means "use ./ under the
    # container's WORKDIR", not a silent prod misconfiguration.
    MEDIAPIPE_MODEL_DIR: Path = Path("./.mediapipe_models")

    # Local disk root for Saved Looks' uploaded/generated images
    # (docs/roadmap/README.md's storage cross-cutting decision #3). Same
    # "safe to default" reasoning as MEDIAPIPE_MODEL_DIR above.
    STORAGE_UPLOADS_DIR: Path = Path("./storage/uploads")

    # How often the worker runner (app/worker/worker_runner.py) polls for
    # queued InferenceJobs. Same "safe to default" reasoning — a missing
    # value just means "poll every 5 seconds", not a silent prod issue.
    WORKER_POLL_INTERVAL_SECONDS: float = 5.0

    # Which AIInferenceClient the worker uses (app/worker/inference_client_provider.py).
    # "demo" returns the user's photo with the garment pinned on and a
    # visible "DEMO" banner, so the whole app flow can be tested before a
    # real try-on API is connected. "catvton" is the unimplemented stub and
    # always fails honestly. A real provider (FASHN) is added here later.
    TRYON_PROVIDER: Literal["demo", "catvton"] = "demo"

    # Reject user photos where MediaPipe can't see a full body (head,
    # shoulders, hips and ankles), before any paid try-on is spent on them.
    FULL_BODY_CHECK_ENABLED: bool = True

    # Make a plain-background cut-out of every user photo (MediaPipe
    # segmentation). Can be turned off on very small servers to save memory.
    BACKGROUND_REMOVAL_ENABLED: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
