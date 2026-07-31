from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SERVICE_ENV: str = "development"
    DEVICE: str = "cpu"  # "cpu" | "cuda" | "mps"

    MODEL_CACHE_DIR: Path = Path("./models")
    HF_TOKEN: str | None = None

    # Placeholder for future NVIDIA NIM integration (see ADR 0002).
    NIM_ENDPOINT_URL: str | None = None

    # Which VirtualTryOnEngine implementation is active — a name looked up
    # in models/engine_registry.py, not a code branch. Swapping models is
    # changing this value, not changing code (see ADR 0006). Not read by
    # anything yet — no engine is wired up to config in this pass.
    TRYON_ENGINE: str = "idm-vton"


@lru_cache
def get_settings() -> Settings:
    return Settings()
