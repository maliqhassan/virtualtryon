// PickedImage / ImageValidationErrorCode live in src/types/index.ts — shared
// with the garment feature.

// Mirrors the response shape planned for the real endpoint in
// docs/roadmap/phase-a-core-loop.md Milestone 2 (`POST /api/v1/uploads/user-photo`).
// No separate request type — preparePhoto takes a PickedImage directly now
// that it performs a real upload (needs the actual file, not just metadata).
export type PreparePhotoResponse = {
  photoId: string;
  status: 'ready';
  receivedAt: string;
};
