import type { Href } from 'expo-router';

/**
 * Same typed-routes caveat as saved-looks/routes.ts: the nested index route
 * plus a sibling dynamic segment (detail/[garmentId]) confuses Expo Router's
 * generator, so route strings are centralized here as `Href` casts instead
 * of repeated inline at each call site.
 */
export const WARDROBE_HREF = '/wardrobe' as Href;
export const ADD_GARMENT_HREF = '/wardrobe/add' as Href;
export function garmentDetailsHref(garmentId: string): Href {
  return { pathname: '/wardrobe/detail/[garmentId]', params: { garmentId } } as Href;
}
