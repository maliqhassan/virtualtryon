import { apiClient } from '@/services/api/client';
import { BackendUnavailableError, uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { MyPhoto, PhotoAngle } from '../types';

const BASE_PATH = '/api/v1/user-photos';

/** backend/app/schemas/user_photo.py */
type UserPhotoDto = {
  id: string;
  storage_key: string;
  image_url: string;
  angle: PhotoAngle;
  cutout_url: string | null;
  created_at: string;
};

function toMyPhoto(dto: UserPhotoDto): MyPhoto {
  return {
    id: dto.id,
    angle: dto.angle,
    imageUrl: dto.image_url,
    cutoutUrl: dto.cutout_url,
    createdAt: dto.created_at,
  };
}

/** The current photo for each view the user has added (front, side, back). */
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
  angle: PhotoAngle,
  onProgress?: (percent: number) => void,
): Promise<MyPhoto> {
  try {
    const dto = await uploadImage<UserPhotoDto>({
      path: BASE_PATH,
      fieldName: 'image',
      image,
      fields: { angle },
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

/** Deletes every photo (all views) and every copy made for try-ons. */
export async function deleteMyPhotos(): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/current`);
}
