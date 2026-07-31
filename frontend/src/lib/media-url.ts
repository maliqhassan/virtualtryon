import { resolveApiBaseUrl } from '@/constants/api-host';

/**
 * Backend-stored media (e.g. SavedLook's image fields) comes back as a
 * relative path (e.g. "/uploads/<uuid>.jpg"), not a full URL — the backend
 * doesn't know its own externally-reachable host. Joins it with the same
 * dynamically-resolved API host every request already uses (see
 * constants/api-host.ts), not a static .env value.
 */
export function resolveMediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${resolveApiBaseUrl()}${path}`;
}
