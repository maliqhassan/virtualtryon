"""Local-disk StorageService implementation, for development. A future
S3/Cloudinary/Firebase provider implements the same StorageService
interface and gets swapped in at get_storage_service() (__init__.py) —
nothing above that point (SavedLook's model, schema, or endpoints) changes.
"""

import shutil
import uuid
from pathlib import Path

from .base import StorageFullError, StorageService

# Free space always left on the disk. Saving stops before the disk is
# completely full, so no file is ever left half-written and the server keeps
# room for temporary files. Uploads and try-on results stop together; the
# per-user and per-address limits are what keep it from getting here.
DEFAULT_RESERVE_BYTES = 150 * 1024 * 1024


class LocalStorageProvider(StorageService):
    def __init__(
        self,
        base_dir: Path,
        url_prefix: str = "/uploads",
        reserve_bytes: int = DEFAULT_RESERVE_BYTES,
    ) -> None:
        self._base_dir = base_dir
        self._url_prefix = url_prefix
        self._reserve_bytes = reserve_bytes
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, content: bytes, extension: str) -> str:
        if shutil.disk_usage(self._base_dir).free - len(content) < self._reserve_bytes:
            raise StorageFullError("Not enough free disk space for this file")
        filename = f"{uuid.uuid4()}.{extension.lstrip('.')}"
        (self._base_dir / filename).write_bytes(content)
        return f"{self._url_prefix}/{filename}"

    def read(self, path: str) -> bytes:
        return self._resolve(path).read_bytes()

    def delete(self, path: str) -> None:
        file_path = self._resolve(path)
        if file_path.exists():
            file_path.unlink()

    def _resolve(self, path: str) -> Path:
        # Path(...).name strips any directory component — even a
        # maliciously-crafted `path` (e.g. "../../etc/passwd") can only
        # ever resolve to a file directly inside base_dir.
        return self._base_dir / Path(path).name
