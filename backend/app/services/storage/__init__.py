"""The one place a new StorageService implementation gets swapped in —
mirrors ai/'s engine_registry.py pattern for the same reason: every caller
depends on get_storage_service() returning a StorageService, never on
LocalStorageProvider by name.
"""

from functools import lru_cache

from app.core.config import get_settings

from .base import StorageService
from .local_storage import LocalStorageProvider

__all__ = ["StorageService", "get_storage_service"]


@lru_cache
def get_storage_service() -> StorageService:
    settings = get_settings()
    return LocalStorageProvider(base_dir=settings.STORAGE_UPLOADS_DIR)
