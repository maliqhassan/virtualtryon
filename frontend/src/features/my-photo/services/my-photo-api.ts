import { apiClient } from '@/services/api/client';
import { BackendUnavailableError, uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { MyPhoto } from '../types';

const BASE_PATH = '/api/v1/user-photos';

/** backend/app/schemas/user_photo.py */
type UserPhotoDto = {
  id: string;
  storage_key: string;
  image_url: string;
  angle: string;
  cutout_url: string | null;
  created_at: string;
};

function toMyPhoto(dto: UserPhotoDto): MyPhoto {
  return {
    id: dto.id,
    imageUrl: dto.image_url,
    cutoutUrl: dto.cutout_url,
    createdAt: dto.created_at,
  };
}

/** All of the user's model photos, newest first. */
export async function listMyPhotos(): Promise<MyPhoto[]> {
  const response = await apiClient.get<UserPhotoDto[]>(BASE_PATH);
  return response.data.map(toMyPhoto);
}

/**
 * No mock fallback: the endpoint is real. A 422 carries the server's own
 * user-facing reason (wrong format, or the full-body check failed) as the
 * error message, which the screen shows as-is.
 */
export async function uploadMyPhoto(
  image: PickedImage,
  onProgress?: (percent: number) => void,
): Promise<MyPhoto> {
  try {
    const dto = await uploadImage<UserPhotoDto>({
      path: BASE_PATH,
      fieldName: 'image',
      image,
      onProgress,
    });
    return toMyPhoto(dto);
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      throw new Error('Can’t reach the server. Check your connection and try again.');
    }
    throw error;
  }
}

/** Deletes one model photo and its files. */
export async function deleteMyPhoto(photoId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${encodeURIComponent(photoId)}`);
}

/** Deletes every model photo and every copy made for try-ons. */
export async function deleteMyPhotos(): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/current`);
}
