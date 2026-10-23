import axios from 'axios';

import { apiClient } from '@/services/api/client';

import type { CreateTryOnJobInput, TryOnJob } from '../types';

const BASE_PATH = '/api/v1/inference-jobs';

/** Raw shape returned by the backend (backend/app/schemas/inference_job.py)
 * — snake_case, matching the Pydantic model exactly. Mapped to this app's
 * own camelCase TryOnJob type at this boundary, same convention as
 * features/wardrobe/services/garments-api.ts.
 */
type InferenceJobDto = {
  id: string;
  garment_id: string | null;
  product_id: string | null;
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
    productId: dto.product_id,
    // Empty after the user deleted their data.
    userImageUrl: dto.user_image_storage_key || null,
    generatedImageUrl: dto.generated_image_url,
    status: dto.status,
    errorMessage: dto.error_message,
    startedAt: dto.started_at,
    completedAt: dto.completed_at,
  };
}

/** No try-ons left on the user's plan (HTTP 402): the app opens the upgrade screen. */
export class TryOnLimitReachedError extends Error {
  constructor() {
    super('No try-ons left on your plan.');
    this.name = 'TryOnLimitReachedError';
  }
}

/** The user hasn't added their photo yet (HTTP 409). */
export class MissingPhotoError extends Error {
  constructor() {
    super('Add your photo before starting a try-on.');
    this.name = 'MissingPhotoError';
  }
}

/** Only the clothing (a wardrobe garment or a store product) is sent: the
 * server uses the caller's saved photo. */
export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJob> {
  try {
    const body =
      'garmentId' in input ? { garment_id: input.garmentId } : { product_id: input.productId };
    const response = await apiClient.post<InferenceJobDto>(BASE_PATH, body);
    return toTryOnJob(response.data);
  } catch (error) {
    // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented API; the rule false-positives on axios's dual export shape.
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 402) throw new TryOnLimitReachedError();
      if (error.response?.status === 409) throw new MissingPhotoError();
      if (!error.response) {
        throw new Error('Can’t reach the server. Check your connection and try again.');
      }
    }
    throw new Error('Couldn’t start the try-on. Please try again.');
  }
}

export async function getTryOnJob(jobId: string): Promise<TryOnJob> {
  const response = await apiClient.get<InferenceJobDto>(`${BASE_PATH}/${jobId}`);
  return toTryOnJob(response.data);
}
