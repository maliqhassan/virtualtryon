import { simulateNetworkCall } from '@/lib/mock-network';
import { BackendUnavailableError, uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { PrepareGarmentResponse } from '../types';

/**
 * `POST /api/v1/garments` is now a real, live endpoint (built for the
 * Wardrobe feature) — this screen predates that work and only ever needs
 * "get a garment photo ready for try-on," not a rich title/category, so it
 * sends fixed defaults rather than adding form fields that would expand
 * this screen's scope. Field name matches the real backend's multipart
 * contract (`image`, not the old placeholder `file`).
 *
 * Only the two response fields this call actually needs — deliberately
 * not a full duplicate of Wardrobe's own GarmentResponse DTO shape/mapping
 * (features/wardrobe/services/garments-api.ts owns that), matching this
 * codebase's existing convention of each API service defining just the
 * DTO shape it needs, not sharing one across feature boundaries.
 */
type GarmentCreateResponse = {
  id: string;
  created_at: string;
};

const DEFAULT_TITLE = 'Garment';
const DEFAULT_CATEGORY = 'Other';

export async function prepareGarment(
  image: PickedImage,
  onProgress?: (percent: number) => void,
): Promise<PrepareGarmentResponse> {
  try {
    const response = await uploadImage<GarmentCreateResponse>({
      path: '/api/v1/garments',
      fieldName: 'image',
      image,
      fields: { title: DEFAULT_TITLE, category: DEFAULT_CATEGORY },
      onProgress,
    });
    return {
      garmentId: response.id,
      status: 'ready',
      receivedAt: response.created_at,
    };
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      console.info('[prepareGarment] Backend unavailable — using mock response.', error.message);
      return simulateNetworkCall(() => ({
        garmentId: `mock-garment-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        status: 'ready' as const,
        receivedAt: new Date().toISOString(),
      }));
    }
    throw error; // a real backend responded with a real error — surface it, don't hide it
  }
}
