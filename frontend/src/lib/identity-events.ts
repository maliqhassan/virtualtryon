/**
 * Signing in or out changes whose data the phone is showing. Stores that
 * hold per-person state on the phone register a reset here, so the auth
 * feature can clear them without importing every feature.
 */
const listeners = new Set<() => void>();

export function onIdentityChange(reset: () => void): void {
  listeners.add(reset);
}

export function emitIdentityChange(): void {
  for (const reset of listeners) reset();
}
