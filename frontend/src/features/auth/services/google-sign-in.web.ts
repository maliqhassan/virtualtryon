/**
 * Web build: Google sign-in uses the phone's native Google and Firebase
 * libraries (google-sign-in.ts), so the web preview only explains that.
 */

export type GoogleSignInErrorCode = 'unavailable' | 'play_services' | 'failed';

export class GoogleSignInError extends Error {
  constructor(readonly code: GoogleSignInErrorCode) {
    super('Google sign-in is available in the Android app.');
    this.name = 'GoogleSignInError';
  }
}

export async function getGoogleIdToken(): Promise<string | null> {
  throw new GoogleSignInError('unavailable');
}

export async function signOutOfGoogle(): Promise<void> {}
