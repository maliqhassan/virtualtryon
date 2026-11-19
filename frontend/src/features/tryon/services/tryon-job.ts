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

/** The photo picked for the try-on was deleted (on another phone, say): the
 * user still has photos, so this isn't "add your photo". */
export class PhotoGoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoGoneError';
  }
}

/** The clothing (a wardrobe garment or a store product), and which of the
 * user's photos to use: the server checks that photo is theirs, and uses
 * their newest when none is named. */
export async function createTryOnJob(
  input: CreateTryOnJobInput & { userPhotoId?: string },
): Promise<TryOnJob> {
  try {
    const body = {
      ...('garmentId' in input ? { garment_id: input.garmentId } : { product_id: input.productId }),
      ...(input.userPhotoId ? { user_photo_id: input.userPhotoId } : {}),
    };
    const response = await apiClient.post<InferenceJobDto>(BASE_PATH, body);
    return toTryOnJob(response.data);
  } catch (error) {
    // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented API; the rule false-positives on axios's dual export shape.
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 402) throw new TryOnLimitReachedError();
      if (error.response?.status === 409) {
        const conflict = (error.response.data as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (conflict?.code === 'photo_gone') {
          throw new PhotoGoneError(conflict.message ?? 'That photo isn’t there any more.');
        }
        throw new MissingPhotoError();
      }
      // The server's daily cap for all users on a real try-on provider.
      const detail = (error.response?.data as { detail?: { code?: string; message?: string } })
        ?.detail;
      if (error.response?.status === 429 && detail?.code === 'tryons_paused') {
        throw new Error(detail.message ?? 'Try-ons are paused for today. Please try again later.');
      }
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
