import type { Href } from 'expo-router';

import { MY_PHOTO_HREF, addPortraitHref } from '../routes';
import { PHOTO_ANGLES, type MyPhoto } from '../types';

import { useMyPhotosQuery } from './use-my-photo';

/**
 * The user's portraits for Today's rail and Wardrobe's Portraits tab: in
 * view order (front, side, back), and where "Add portrait" goes. Add fills
 * the first missing view, so it never silently replaces the front photo in
 * use; with all three it opens My photo to choose. `addHref` is null until
 * the photos have loaded, so a slow or failed request can't make it look
 * as if the front view were missing.
 */
export function usePortraits(): {
  ordered: MyPhoto[];
  addHref: Href | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useMyPhotosQuery();
  const photos = query.data ?? [];
  const ordered = PHOTO_ANGLES.flatMap(({ angle }) => photos.filter((p) => p.angle === angle));
  const missing = PHOTO_ANGLES.find(({ angle }) => !photos.some((p) => p.angle === angle));
  const addHref = query.isSuccess
    ? missing
      ? addPortraitHref(missing.angle)
      : MY_PHOTO_HREF
    : null;
  return {
    ordered,
    addHref,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
