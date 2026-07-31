import { apiClient } from '@/services/api/client';

import type { CreateTryOnJobInput, TryOnJob } from '../types';

const BASE_PATH = '/api/v1/inference-jobs';

/** Raw shape returned by the backend (backend/app/schemas/inference_job.py)
 * — snake_case, matching the Pydantic model exactly. Mapped to this app's
 * own camelCase TryOnJob type at this boundary, same convention as
 * features/wardrobe/services/garments-api.ts and features/profile/services/profile-api.ts.
 */
type InferenceJobDto = {
  id: string;
  garment_id: string | null;
  profile_id: string | null;
  user_image_storage_key: string;
  generated_image_url: string | null;
  status: TryOnJob['status'];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toTryOnJob(dto: InferenceJobDto): TryOnJob {
  return {
    id: dto.id,
    garmentId: dto.garment_id,
    generatedImageUrl: dto.generated_image_url,
    status: dto.status,
    errorMessage: dto.error_message,
    startedAt: dto.started_at,
    completedAt: dto.completed_at,
  };
}

/** Real create call — no mock fallback. Unlike prepare-photo.ts/
 * prepare-garment.ts (which fall back to a mock on BackendUnavailableError
 * because their real endpoints may not exist), POST /api/v1/inference-jobs
 * is a confirmed-real endpoint (Sprint 3 Stage 1) — a failure here is a
 * real error to surface, not a signal to fake a job. */
export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJob> {
  const response = await apiClient.post<InferenceJobDto>(BASE_PATH, {
    garment_id: input.garmentId,
    user_image_storage_key: input.userPhotoId,
  });
  return toTryOnJob(response.data);
}

export async function getTryOnJob(jobId: string): Promise<TryOnJob> {
  const response = await apiClient.get<InferenceJobDto>(`${BASE_PATH}/${jobId}`);
  return toTryOnJob(response.data);
}
