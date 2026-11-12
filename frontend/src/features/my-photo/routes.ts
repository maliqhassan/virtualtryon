import type { Href } from 'expo-router';

import type { PhotoAngle } from './types';

export const MY_PHOTO_HREF = '/my-photo' as Href;

export function myPhotoHref(angle: PhotoAngle): Href {
  return { pathname: '/my-photo', params: { angle } } as Href;
}

/** My photo on that view, opening the photo picker straight away ("Add portrait"). */
export function addPortraitHref(angle: PhotoAngle): Href {
  return { pathname: '/my-photo', params: { angle, pick: '1' } } as Href;
}
