import type { Href } from 'expo-router';

/** Route strings for this feature, centralized as `Href` casts so screens
 * don't repeat them. Looks is a tab; a single look opens as a stack screen. */
export const LOOKS_HREF = '/looks' as Href;
export function lookDetailsHref(lookId: string): Href {
  return { pathname: '/look/[lookId]', params: { lookId } } as Href;
}
