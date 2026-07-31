// PickedImage / ImageValidationErrorCode live in src/types/index.ts — shared
// with the user-photo feature.

// Mirrors the response shape planned for the real endpoint in
// docs/roadmap/phase-a-core-loop.md Milestone 3 (`POST /api/v1/garments`).
// No separate request type — prepareGarment takes a PickedImage directly now
// that it performs a real upload (needs the actual file, not just metadata).
export type PrepareGarmentResponse = {
  garmentId: string;
  status: 'ready';
  receivedAt: string;
};
