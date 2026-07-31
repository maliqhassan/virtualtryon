// Shared, cross-feature TypeScript types go here (e.g. API response envelopes).
// Feature-specific types belong inside that feature's folder under `features/`.

// Used by any feature that lets a user pick/capture an image (currently
// user-photo and garment) — the raw picked asset, before it's been prepared
// for any particular backend resource.
export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
};

export type ImageValidationErrorCode = 'unsupported_format' | 'file_too_large';
