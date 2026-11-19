import type { Href } from 'expo-router';

export const MY_PHOTO_HREF = '/my-photo' as Href;

/** My photos, opening the photo picker straight away ("Add portrait"); the
 * screen goes back once the new photo is added. */
export const ADD_PORTRAIT_HREF = { pathname: '/my-photo', params: { pick: '1' } } as Href;
