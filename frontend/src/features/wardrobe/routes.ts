import type { Href } from 'expo-router';

/** Route strings for this feature, centralized as `Href` casts so screens
 * don't repeat them (same convention as saved-looks/routes.ts). */
export type WardrobeTab = 'outfits' | 'portraits' | 'clothes';
/** Wardrobe on one of its tabs (handoff v2.1 change 7: the tab lives in the URL). */
export function wardrobeTabHref(tab: WardrobeTab): Href {
  return { pathname: '/wardrobe', params: { tab } } as Href;
}
/** Wardrobe's Clothes, named explicitly: the tab screen keeps its last
 * `tab` param, so a bare "/wardrobe" could reopen Outfits or Portraits. */
export const WARDROBE_HREF = wardrobeTabHref('clothes');
export const ADD_GARMENT_HREF = '/garment/add' as Href;
/** With returnToTryOn, the new piece comes back selected on the Try On screen. */
export function addGarmentHref(options: { returnToTryOn?: boolean } = {}): Href {
  return (
    options.returnToTryOn
      ? { pathname: '/garment/add', params: { returnTo: 'tryon' } }
      : '/garment/add'
  ) as Href;
}
/** Back to the Try On tab with this piece selected and ready to try on. */
export function tryOnGarmentHref(garmentId: string): Href {
  return { pathname: '/tryon', params: { selected: garmentId, at: String(Date.now()) } } as Href;
}
export function garmentDetailsHref(garmentId: string): Href {
  return { pathname: '/garment/[garmentId]', params: { garmentId } } as Href;
}
/** Wardrobe sub-screens (design_handoff_ai_stylist/04-react-native.md §3). */
export const LAUNDRY_HREF = '/laundry' as Href;
export const STATS_HREF = '/stats' as Href;
export const PACKING_HREF = '/packing' as Href;
