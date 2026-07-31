import type { Href } from 'expo-router';

/**
 * Expo Router's typed-routes generator only lists "/saved-looks/index" as a
 * valid literal for this nested index route, never the clean "/saved-looks"
 * — but verified directly (headless browser, both paths hit for real):
 * "/saved-looks/index" 404s at runtime, "/saved-looks" is the one that
 * actually renders the History screen. The type is wrong here, not the
 * runtime; every reference to this route uses this one constant rather than
 * repeating the cast at each call site.
 */
export const SAVED_LOOKS_HISTORY_HREF = '/saved-looks' as Href;
