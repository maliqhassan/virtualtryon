import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

/**
 * Generic credential-grade storage, keyed by name — a thin wrapper so
 * callers never import `expo-secure-store` directly. Deliberately generic
 * (not device-id-specific): the same mechanism will later store real JWT
 * access/refresh tokens once authentication exists, without this module
 * changing at all.
 *
 * expo-secure-store's documented platforms are Android/iOS/tvOS only — web
 * isn't listed. Verified directly (a real browser session): calling it on
 * web throws ("getValueWithKeyAsync is not a function"), not a documented
 * "unsupported" no-op. Without a fallback, that means every single request
 * on web looks like a brand-new anonymous guest — not just across page
 * reloads, but between one request and the very next one in the same
 * session, since nothing ever successfully persists. An in-memory
 * module-level fallback for web keeps identity stable for the lifetime of
 * a tab (lost on refresh, same as any other in-memory web state) rather
 * than never at all. Native platforms still go through real SecureStore.
 */
const webMemoryStore = new Map<string, string>();

export async function getStoredToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webMemoryStore.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`secure-token-store: getStoredToken(${key}) failed`, error);
    return null;
  }
}

export async function setStoredToken(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webMemoryStore.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`secure-token-store: setStoredToken(${key}) failed`, error);
  }
}

export async function deleteStoredToken(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webMemoryStore.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`secure-token-store: deleteStoredToken(${key}) failed`, error);
  }
}
