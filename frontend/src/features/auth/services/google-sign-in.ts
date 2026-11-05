import { env } from '@/constants/env';

/**
 * Google sign-in through Firebase (backend ADR 0012): Google's account
 * picker, then Firebase, which returns a token our server checks. Firebase
 * only proves who the user is; the session comes from our server.
 *
 * The native modules are loaded on first use, not at startup, so Expo Go
 * (which doesn't include them) runs the rest of the app and this throws
 * `unavailable` instead of crashing.
 */

export type GoogleSignInErrorCode = 'unavailable' | 'play_services' | 'failed';

const MESSAGES: Record<GoogleSignInErrorCode, string> = {
  unavailable: 'Google sign-in isn’t available in this version of the app.',
  play_services: 'Google sign-in needs Google Play services. Update them and try again.',
  failed: 'Google sign-in didn’t go through. Please try again.',
};

export class GoogleSignInError extends Error {
  constructor(readonly code: GoogleSignInErrorCode) {
    super(MESSAGES[code]);
    this.name = 'GoogleSignInError';
  }
}

type Modules = {
  google: typeof import('@react-native-google-signin/google-signin');
  auth: typeof import('@react-native-firebase/auth');
};

let modules: Promise<Modules> | null = null;

function loadModules(): Promise<Modules> {
  modules ??= (async () => {
    const webClientId = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) throw new GoogleSignInError('unavailable');
    try {
      const [google, auth] = await Promise.all([
        import('@react-native-google-signin/google-signin'),
        import('@react-native-firebase/auth'),
      ]);
      google.GoogleSignin.configure({ webClientId });
      return { google, auth };
    } catch {
      // Expo Go, or a build made without the native modules.
      throw new GoogleSignInError('unavailable');
    }
  })();
  // A failed load is retried next time rather than cached.
  modules.catch(() => {
    modules = null;
  });
  return modules;
}

/** The Firebase ID token for the account the user picks, or null when they
 * close the picker. */
export async function getGoogleIdToken(): Promise<string | null> {
  const { google, auth } = await loadModules();
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = google;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const googleToken = response.data.idToken;
    if (!googleToken) throw new GoogleSignInError('failed');

    const firebase = auth.getAuth();
    const credential = auth.GoogleAuthProvider.credential(googleToken);
    const { user } = await auth.signInWithCredential(firebase, credential);
    const idToken = await user.getIdToken();
    // Our server keeps the session; Firebase's own isn't used after this.
    await auth.signOut(firebase);
    return idToken;
  } catch (error) {
    if (error instanceof GoogleSignInError) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError('play_services');
      }
    }
    throw new GoogleSignInError('failed');
  }
}

/** Forgets the Google account on this phone, so the picker shows next time. */
export async function signOutOfGoogle(): Promise<void> {
  try {
    const { google } = await loadModules();
    await google.GoogleSignin.signOut();
  } catch {
    // Not available or never signed in: nothing to forget.
  }
}
