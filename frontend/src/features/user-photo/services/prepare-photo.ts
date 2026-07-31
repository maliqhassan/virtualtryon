import { simulateNetworkCall } from '@/lib/mock-network';
import { BackendUnavailableError, uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { PreparePhotoResponse } from '../types';

/**
 * `POST /api/v1/user-photos` is now a real, live endpoint (Sprint 4 Stage 3)
 * — mirrors prepare-garment.ts's exact structure: attempt the real upload
 * first, fall back to a mock only when the backend is genuinely
 * unreachable (BackendUnavailableError), same as every other upload flow
 * in this app.
 */
type UserPhotoCreateResponse = {
  storage_key: string;
  created_at: string;
};

export async function preparePhoto(
  image: PickedImage,
  onProgress?: (percent: number) => void,
): Promise<PreparePhotoResponse> {
  try {
    const response = await uploadImage<UserPhotoCreateResponse>({
      path: '/api/v1/user-photos',
      fieldName: 'image',
      image,
      onProgress,
    });
    return {
      // Named `photoId` for compatibility with every existing caller
      // (upload-session store, useTryOnJob's `userPhotoId` input) — but
      // holds the real storage_key, not the UserPhoto row's own `id`.
      // InferenceJob creation needs the storage key (its
      // user_image_storage_key field, not a foreign key to this row), so
      // that's the value that has to flow through this field. See
      // ../types.ts's PreparePhotoResponse doc comment.
      photoId: response.storage_key,
      status: 'ready',
      receivedAt: response.created_at,
    };
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      console.info('[preparePhoto] Backend unavailable — using mock response.', error.message);
      return simulateNetworkCall(() => ({
        photoId: `mock-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        status: 'ready' as const,
        receivedAt: new Date().toISOString(),
      }));
    }
    throw error; // a real backend responded with a real error — surface it, don't hide it
  }
}
