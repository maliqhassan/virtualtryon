import { apiClient } from '@/services/api/client';
import { uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { Garment, UpdateGarmentInput } from '../types';

const BASE_PATH = '/api/v1/garments';

/** Raw shape returned by the backend (backend/app/schemas/garment.py) —
 * snake_case, matching the Pydantic model exactly. Mapped to this app's
 * own camelCase Garment type at this boundary, same convention as
 * features/saved-looks/services/saved-looks-api.ts.
 */
type GarmentDto = {
  id: string;
  title: string;
  category: string;
  color: string | null;
  season: string | null;
  image_url: string;
  created_at: string;
  updated_at: string;
};

function toGarment(dto: GarmentDto): Garment {
  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    color: dto.color,
    season: dto.season,
    imageUrl: dto.image_url,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export async function listGarments(): Promise<Garment[]> {
  const response = await apiClient.get<GarmentDto[]>(BASE_PATH);
  return response.data.map(toGarment);
}

export type CreateGarmentInput = {
  image: PickedImage;
  title: string;
  category: string;
};

/**
 * Reuses the same generic uploadImage() helper the existing garment
 * (Phase 4) and saved-looks features already use — no second upload
 * mechanism. Unlike that older flow, this one doesn't fall back to a mock
 * on BackendUnavailableError: the endpoint is confirmed real, so a failed
 * request here is a genuine error, not "the backend doesn't exist yet."
 */
export async function createGarment(input: CreateGarmentInput): Promise<Garment> {
  const dto = await uploadImage<GarmentDto>({
    path: BASE_PATH,
    fieldName: 'image',
    image: input.image,
    fields: { title: input.title, category: input.category },
  });
  return toGarment(dto);
}

export async function updateGarment(id: string, input: UpdateGarmentInput): Promise<Garment> {
  const response = await apiClient.patch<GarmentDto>(`${BASE_PATH}/${id}`, input);
  return toGarment(response.data);
}

export async function deleteGarment(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}
