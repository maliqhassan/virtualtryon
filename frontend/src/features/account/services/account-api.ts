import { apiClient } from '@/services/api/client';

/** Deletes the user's photos, wardrobe, looks, profile and every stored image. */
export async function deleteAllMyData(): Promise<void> {
  await apiClient.delete('/api/v1/account/data');
}
