import { simulateNetworkCall } from '@/lib/mock-network';
import { BackendUnavailableError, uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { PreparePhotoResponse } from '../types';

/**
 * Attempts a real upload to `POST /api/v1/uploads/user-photo`
 * (docs/roadmap/phase-a-core-loop.md Milestone 2). That endpoint doesn't
 * exist yet, so this will currently always land on the `BackendUnavailableError`
 * branch (via a 404, or a connection error if the backend isn't running at
 * all) and fall back to a mock response — this is expected, not a bug.
 * Once the real endpoint exists, this starts succeeding for real with zero
 * changes needed above this function.
 */
export async function preparePhoto(
  image: PickedImage,
  onProgress?: (percent: number) => void,
): Promise<PreparePhotoResponse> {
  try {
    return await uploadImage<PreparePhotoResponse>({
      path: '/api/v1/uploads/user-photo',
      fieldName: 'file',
      image,
      fields: { width: image.width, height: image.height },
      onProgress,
    });
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
