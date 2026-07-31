import type { Href } from 'expo-router';

/** Same typed-routes caveat as saved-looks/routes.ts and wardrobe/routes.ts
 * — centralized here as `Href` casts rather than repeated inline. Profile
 * is a singleton resource (no per-item id), so unlike those two features
 * there's no nested-index-vs-sibling-dynamic-route ambiguity to design
 * around here. */
export const PROFILE_HREF = '/profile' as Href;
export const EDIT_PROFILE_HREF = '/profile/edit' as Href;
