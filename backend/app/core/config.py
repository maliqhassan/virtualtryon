from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, PostgresDsn, RedisDsn
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
    REDIS_URL: RedisDsn

    SECRET_KEY: str
    CORS_ORIGINS: list[AnyHttpUrl] = []

    # Local cache dir for MediaPipe's downloaded .task model bundles (ADR
    # 0007). Not environment-sensitive like DB/Redis/secrets above, so a
    # default is safe here — a missing value just means "use ./ under the
    # container's WORKDIR", not a silent prod misconfiguration.
    MEDIAPIPE_MODEL_DIR: Path = Path("./.mediapipe_models")

    # Local disk root for Saved Looks' uploaded/generated images
    # (docs/roadmap/README.md's storage cross-cutting decision #3). Same
    # "safe to default" reasoning as MEDIAPIPE_MODEL_DIR above.
    STORAGE_UPLOADS_DIR: Path = Path("./storage/uploads")


@lru_cache
def get_settings() -> Settings:
    return Settings()
