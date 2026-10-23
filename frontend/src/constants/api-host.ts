import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { env } from '@/constants/env';

const BACKEND_PORT = 8000;

/**
 * Derives the backend's base URL from whatever host the app is ACTUALLY
 * connected through right now, instead of trusting a hardcoded LAN IP in
 * `.env` — a static IP goes stale the moment DHCP hands the dev machine a
 * new address (hit this twice in one debugging session: once from an
 * outdated address, once because it changed again between sessions), and
 * a physical device needs a different address than `localhost` in the
 * first place.
 *
 * - Web: the page is already being served by this same dev server, so its
 *   own origin (`window.location.hostname`) is exactly the right host.
 * - Native dev (Expo Go / dev client): `Constants.expoConfig.hostUri` is
 *   Metro's own address as seen by the client already connected to it
 *   (e.g. "192.168.1.2:8081") — same host, different port (the backend,
 *   not Metro).
 * - Anywhere `hostUri` isn't available (a production build, where there's
 *   no dev server to detect at all) falls back to `EXPO_PUBLIC_API_URL`,
 *   which is what a real deployed build should be configured with anyway.
 *
 * An `https://` `EXPO_PUBLIC_API_URL` (the hosted backend on Render) always
 * wins, so Expo Go on a phone can use the deployed API while Metro still
 * runs on this machine.
 */
export function resolveApiBaseUrl(): string {
  if (env.EXPO_PUBLIC_API_URL.startsWith('https://')) {
    return env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:${BACKEND_PORT}`;
    }
    return env.EXPO_PUBLIC_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${BACKEND_PORT}`;
  }

  return env.EXPO_PUBLIC_API_URL;
}
