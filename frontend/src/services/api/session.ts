import { type AxiosInstance, isAxiosError } from 'axios';

import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/secure-token-store';

import { DEVICE_ID_STORAGE_KEY } from './device-identity';

/**
 * Signed-in session (backend ADR 0010): the token from `POST /auth/email`,
 * sent as `Authorization: Bearer` on every request. Without one the app is
 * a guest, identified by its device id. Treated as a credential: kept in
 * secure storage, never logged or shown.
 */
const SESSION_TOKEN_KEY = 'session_token';

export async function saveSessionToken(token: string): Promise<void> {
  await setStoredToken(SESSION_TOKEN_KEY, token);
}

/**
 * Signs out on this phone: drops the token and the old guest id too, so the
 * next request starts a fresh guest rather than an empty copy of the account.
 */
export async function clearSession(): Promise<void> {
  await deleteStoredToken(SESSION_TOKEN_KEY);
  await deleteStoredToken(DEVICE_ID_STORAGE_KEY);
}

export function attachSession(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const token = await getStoredToken(SESSION_TOKEN_KEY);
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(undefined, async (error: unknown) => {
    // An expired or revoked session: forget the token, so the next request
    // goes through as a guest instead of failing forever. Only the token:
    // the device id may already be a fresh guest's, issued by a parallel request.
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      (error.response.data as { detail?: { code?: string } } | undefined)?.detail?.code ===
        'session_expired'
    ) {
      await deleteStoredToken(SESSION_TOKEN_KEY);
    }
    return Promise.reject(error);
  });
}
