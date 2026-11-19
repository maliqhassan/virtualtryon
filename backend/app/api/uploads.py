"""Turns an uploaded file into the ImageUpload the services validate.

Shared by every endpoint that accepts an image (previously each had its own
copy). Reads at most one byte past the size limit, so an oversized file
costs a bounded amount of memory and still fails validation as too large
(app/services/image_validation.py).
"""

from fastapi import UploadFile

from app.services.image_validation import MAX_UPLOAD_BYTES, ImageUpload


async def read_image_upload(file: UploadFile) -> ImageUpload:
    return ImageUpload(
        content=await file.read(MAX_UPLOAD_BYTES + 1),
        content_type=file.content_type,
        filename=file.filename,
    )
