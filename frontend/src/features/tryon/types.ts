export type TryOnJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TryOnStepId = 'reading_measurements' | 'draping_fabric' | 'matching_light';

/**
 * The generated try-on output. `imageUri` is null in mock mode — the
 * results screen renders a labeled placeholder instead of a real image.
 * Once real AI generation exists (docs/roadmap Milestone 12), the mock
 * service is replaced by one that populates a real `imageUri` and sets
 * `isMock: false`; the results screen's rendering already branches on
 * `imageUri` being present, so no screen changes are needed for that swap.
 */
export type TryOnResult = {
  imageUri: string | null;
  isMock: boolean;
  mockCaption: string | null;
  reasoning: string;
};

// Mirrors the shape planned for the real endpoints in
// docs/roadmap/phase-a-core-loop.md Milestone 4
// (`POST /api/v1/tryon` creates a job, `GET /api/v1/tryon/:id` polls it).
export type TryOnJob = {
  id: string;
  status: TryOnJobStatus;
  stepId: TryOnStepId | null;
  stepIndex: number; // 0-based; -1 before processing starts
  stepCount: number;
  progress: number; // 0-100
  errorMessage: string | null;
  completedAt: string | null;
  result: TryOnResult | null; // populated only once status === 'completed'
};

export type CreateTryOnJobInput = {
  userPhotoId: string;
  garmentId: string;
};
