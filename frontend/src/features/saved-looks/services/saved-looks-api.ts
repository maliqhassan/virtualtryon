import { apiClient } from '@/services/api/client';

import type { SavedLook, UpdateSavedLookInput } from '../types';

const BASE_PATH = '/api/v1/saved-looks';

/** Raw shape returned by the backend (backend/app/schemas/saved_look.py) —
 * snake_case, matching the Pydantic model field names exactly. Mapped to
 * the app's own camelCase SavedLook type at this boundary, the same
 * translation convention used everywhere else server data enters the app.
 */
type SavedLookDto = {
  id: string;
  title: string;
  user_image_url: string;
  clothing_image_url: string;
  generated_image_url: string;
  is_favourite: boolean;
  created_at: string;
};

function toSavedLook(dto: SavedLookDto): SavedLook {
  return {
    id: dto.id,
    title: dto.title,
    userImageUrl: dto.user_image_url,
    clothingImageUrl: dto.clothing_image_url,
    generatedImageUrl: dto.generated_image_url,
    isFavourite: dto.is_favourite,
    createdAt: dto.created_at,
  };
}

export async function listSavedLooks(): Promise<SavedLook[]> {
  const response = await apiClient.get<SavedLookDto[]>(BASE_PATH);
  return response.data.map(toSavedLook);
}

export async function updateSavedLook(id: string, input: UpdateSavedLookInput): Promise<SavedLook> {
  const response = await apiClient.patch<SavedLookDto>(`${BASE_PATH}/${id}`, {
    title: input.title,
    is_favourite: input.isFavourite,
  });
  return toSavedLook(response.data);
}

export async function deleteSavedLook(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}

// createSavedLook() (POST, multipart, 3 file parts) deliberately isn't
// here yet — Cycle 1 (this feature) only lists/renames/favourites/deletes
// existing looks; nothing in it creates one. It belongs to the
// auto-save-after-tryon retrofit (Cycle 2), once what to actually upload
// as "generated_image" is resolved — building it now would be a function
// with no real caller.
