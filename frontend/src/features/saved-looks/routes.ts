import type { Href } from 'expo-router';

/** Route strings for this feature, centralized as `Href` casts so screens
 * don't repeat them. Saved looks live in Wardrobe's Outfits tab (handoff
 * v2.1 change 7); a single look is its own stack screen. */
export const LOOKS_HREF = { pathname: '/wardrobe', params: { tab: 'outfits' } } as Href;
export function lookDetailsHref(lookId: string): Href {
  return { pathname: '/look/[lookId]', params: { lookId } } as Href;
}
