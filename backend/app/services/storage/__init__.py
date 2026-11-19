"""The one place a new StorageService implementation gets swapped in —
mirrors ai/'s engine_registry.py pattern for the same reason: every caller
depends on get_storage_service() returning a StorageService, never on
LocalStorageProvider by name.
"""

from functools import lru_cache

from app.core.config import get_settings

from .base import StorageFullError, StorageService
from .local_storage import LocalStorageProvider

__all__ = ["StorageFullError", "StorageService", "get_storage_service", "save_together"]


def save_together(storage: StorageService, files: list[tuple[bytes, str]]) -> list[str]:
    """Saves several (content, extension) files that belong together, or
    none: if one save fails (e.g. the disk is full), the ones already saved
    are deleted before the error is raised, so nothing is left orphaned."""
    saved: list[str] = []
    try:
        for content, extension in files:
            saved.append(storage.save(content, extension))
    except Exception:
        for path in saved:
            storage.delete(path)
        raise
    return saved


@lru_cache
def get_storage_service() -> StorageService:
    settings = get_settings()
    return LocalStorageProvider(base_dir=settings.STORAGE_UPLOADS_DIR)
