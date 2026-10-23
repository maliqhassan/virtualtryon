/** Mirrors backend/app/models/inference_job.py's InferenceJobStatus exactly
 * (queued, not the old mock's `pending`) — this is the real backend's
 * vocabulary now, not a placeholder. */
export type TryOnJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Mirrors backend/app/schemas/inference_job.py's InferenceJobResponse —
 * only the fields this app currently uses (no `profileId`/`userImageStorageKey`,
 * nothing consumes them yet). No `stepId`/`progress`/`result` — the real
 * backend has no fine-grained stage tracking or generation output to bind
 * those to (Stage 1 never runs AI); inventing them would be fake data, not
 * a UI nicety. `generatedImageUrl` is the one real analogue to the old
 * mock's `result.imageUri` — null until a future worker actually generates
 * something.
 */
export type TryOnJob = {
  id: string;
  garmentId: string | null;
  /** Set when the try-on used a store product instead of a wardrobe item. */
  productId: string | null;
  /** The photo this try-on was made from (not necessarily the current one). */
  userImageUrl: string | null;
  generatedImageUrl: string | null;
  status: TryOnJobStatus;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

/** The user photo isn't part of the request: the server uses the caller's
 * saved "My photo" (features/my-photo). */
export type CreateTryOnJobInput = { garmentId: string } | { productId: string };
