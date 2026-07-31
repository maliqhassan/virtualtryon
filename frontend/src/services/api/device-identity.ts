import type { AxiosInstance } from 'axios';

import { getStoredToken, setStoredToken } from '@/lib/secure-token-store';

/**
 * Guest identity (backend/app/services/guest_identity.py): the server
 * issues an unguessable device id via this response header on first
 * contact and expects it resent on every later request, or the caller
 * looks like a brand-new anonymous guest each time. Treated as a
 * credential — never logged, never rendered in any screen.
 */
const DEVICE_ID_HEADER = 'X-Device-Id';
const DEVICE_ID_STORAGE_KEY = 'device_id';

/**
 * Attaches the stored device id to every outgoing request (if one exists
 * yet) and persists whatever the server issues back. Applied to both
 * `apiClient` and `uploadClient` — harmless/inert for any request the
 * backend doesn't use it on.
 */
export function attachDeviceIdentity(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const deviceId = await getStoredToken(DEVICE_ID_STORAGE_KEY);
    if (deviceId) {
      config.headers.set(DEVICE_ID_HEADER, deviceId);
    }
    return config;
  });

  client.interceptors.response.use(async (response) => {
    const issuedId = response.headers[DEVICE_ID_HEADER.toLowerCase()] as string | undefined;
    if (issuedId) {
      await setStoredToken(DEVICE_ID_STORAGE_KEY, issuedId);
    }
    return response;
  });
}
