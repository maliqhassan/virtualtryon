"""The generic object-storage interface planned since
`docs/roadmap/README.md`'s cross-cutting decision #3 ("local disk now,
S3-compatible deferred on purpose... behind an interface narrow enough
that swapping in S3-compatible storage later touches one module, not
every caller") — never built until this feature. Kept to exactly
`save`/`read`/`delete` per `CLAUDE.md`'s own Interface Segregation example
for this exact interface.
"""

from abc import ABC, abstractmethod


class StorageFullError(Exception):
    """Raised by `save` when the storage can't take more files. Part of the
    interface, so callers handle it the same whatever the implementation."""


class StorageService(ABC):
    @abstractmethod
    def save(self, content: bytes, extension: str) -> str:
        """Persist `content` and return its URL/path. `extension` (e.g.
        "jpg") is used to name the stored file — never a client-supplied
        filename directly, to avoid path traversal. Raises StorageFullError
        when there's no room for it."""
        raise NotImplementedError

    @abstractmethod
    def read(self, path: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, path: str) -> None:
        raise NotImplementedError
