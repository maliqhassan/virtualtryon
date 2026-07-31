// PickedImage / ImageValidationErrorCode live in src/types/index.ts — shared
// with the garment feature.

// `POST /api/v1/user-photos` is real (Sprint 4 Stage 3). No separate
// request type — preparePhoto takes a PickedImage directly since it
// performs a real upload (needs the actual file, not just metadata).
export type PreparePhotoResponse = {
  /** Despite the name, holds the backend's `storage_key` (e.g.
   * "/uploads/<uuid>.png"), not the UserPhoto row's own `id` — this is
   * the value InferenceJob creation needs
   * (`CreateTryOnJobInput.userPhotoId` → `user_image_storage_key`, which
   * was never given a foreign key to this table; see
   * docs/decisions/0008-inference-job-persistence.md). Named `photoId`
   * to avoid touching every existing caller (upload-session store,
   * useTryOnJob) for a rename that wouldn't change any behavior. */
  photoId: string;
  status: 'ready';
  receivedAt: string;
};
