import type { Href } from 'expo-router';

import { ADD_PORTRAIT_HREF, MY_PHOTO_HREF } from '../routes';
import { useSelectedPhoto } from '../selected-photo-store';
import { MAX_MODEL_PHOTOS, type MyPhoto } from '../types';

import { pickInUse, useMyPhotosQuery } from './use-my-photo';

/**
 * The user's model photos for Today's rail, Wardrobe's Portraits tab and the
 * Try-On studio: newest first, which one try-ons use, how to pick another,
 * and where "Add" goes. With the maximum already saved, Add opens My photos
 * (to delete one) instead of the picker. `addHref` is null until the photos
 * have loaded.
 */
export function usePortraits(): {
  ordered: MyPhoto[];
  inUseId: string | null;
  select: (photoId: string) => void;
  addHref: Href | null;
  isFull: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useMyPhotosQuery();
  const selectedId = useSelectedPhoto((state) => state.photoId);
  const select = useSelectedPhoto((state) => state.select);
  const ordered = query.data ?? [];
  const isFull = ordered.length >= MAX_MODEL_PHOTOS;
  return {
    ordered,
    inUseId: pickInUse(ordered, selectedId)?.id ?? null,
    select,
    addHref: query.isSuccess ? (isFull ? MY_PHOTO_HREF : ADD_PORTRAIT_HREF) : null,
    isFull,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
