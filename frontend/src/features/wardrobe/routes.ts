import type { Href } from 'expo-router';

/** Route strings for this feature, centralized as `Href` casts so screens
 * don't repeat them (same convention as saved-looks/routes.ts). */
export const WARDROBE_HREF = '/wardrobe' as Href;
export const ADD_GARMENT_HREF = '/garment/add' as Href;
/** With returnToTryOn, the new piece comes back selected on the Try On screen. */
export function addGarmentHref(options: { returnToTryOn?: boolean } = {}): Href {
  return (
    options.returnToTryOn
      ? { pathname: '/garment/add', params: { returnTo: 'tryon' } }
      : '/garment/add'
  ) as Href;
}
export function garmentDetailsHref(garmentId: string): Href {
  return { pathname: '/garment/[garmentId]', params: { garmentId } } as Href;
}
