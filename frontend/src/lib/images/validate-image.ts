import type { ImageValidationErrorCode } from '@/types';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
] as const;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

type ValidatableImage = {
  mimeType?: string | null;
  fileSize?: number | null;
};

/**
 * Shared by every feature that picks/captures an image (user-photo, garment,
 * and future ones) — format/size rules aren't specific to what the photo is
 * of. Client-side validation is a UX fast-fail, not a security boundary; the
 * planned real endpoints (docs/roadmap) re-validate server-side with MIME
 * sniffing, not a client-declared type. Missing metadata (some platforms
 * don't always report fileSize/mimeType) is allowed through rather than
 * rejected, since failing closed here would block otherwise-valid photos for
 * a check that isn't the actual enforcement point.
 */
export function validateImage(image: ValidatableImage): ImageValidationErrorCode | null {
  if (
    image.mimeType &&
    !ALLOWED_IMAGE_MIME_TYPES.includes(image.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
  ) {
    return 'unsupported_format';
  }
  if (image.fileSize && image.fileSize > MAX_IMAGE_SIZE_BYTES) {
    return 'file_too_large';
  }
  return null;
}

export function describeValidationError(code: ImageValidationErrorCode): string {
  switch (code) {
    case 'unsupported_format':
      return "That file type isn't supported. Use a JPEG, PNG, or HEIC photo.";
    case 'file_too_large':
      return 'That photo is too large. Choose one under 10MB.';
  }
}
