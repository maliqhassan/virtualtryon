import type { Href } from 'expo-router';

import type { PhotoAngle } from './types';

// Public API of the my-photo feature, for other features to import.
export { MY_PHOTO_QUERY_KEY, useMyPhotoQuery, useMyPhotosQuery } from './hooks/use-my-photo';
export { PHOTO_ANGLES, displayUrl } from './types';
export type { MyPhoto, PhotoAngle } from './types';
export const MY_PHOTO_HREF = '/my-photo' as Href;
export function myPhotoHref(angle: PhotoAngle): Href {
  return { pathname: '/my-photo', params: { angle } } as Href;
}
