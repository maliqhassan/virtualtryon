# 12. Google sign-in through Firebase, the app's only sign-in

Date: 2026-11-05

Status: Accepted. Builds the Firebase part of ADR 0009 (Google only; Apple
later). Replaces ADR 0010's email screen in the app; its endpoint stays.

## Context

The app is going to Play Console internal testing as an Android release
build, so it no longer has to run in Expo Go. The sign-in step should be
one tap: "Continue with Google", pick an account, done. ADR 0009 chose
Firebase Authentication for Google and Apple sign-in, with accounts and data
kept in our own Postgres database.

## Decision

- The sign-in screen offers **Continue with Google** and the existing
  "Try it first as a guest". Apple and email are gone from the app. Apple
  comes back before an iOS release (App Store guideline 4.8).
- On the phone, `@react-native-google-signin/google-signin` shows Google's
  account picker. Its Google token signs in to Firebase
  (`@react-native-firebase/auth`), which returns a Firebase ID token. The
  app sends that to `POST /api/v1/auth/google` and signs out of Firebase:
  from then on the session is our own token, exactly as in ADR 0010.
- The backend checks the Firebase ID token itself with PyJWT (RS256 against
  Google's published keys, audience and issuer = our Firebase project,
  not expired), rather than with `firebase-admin`, which would add the whole
  Google Cloud client stack for the same check. Only `google.com` sign-ins
  are accepted for now. `FIREBASE_PROJECT_ID` empty turns it off (503).
- `users.firebase_uid` (unique) links a row to its Firebase user. A new
  Google user claims the caller's guest row like email sign-up does
  (wardrobe and photos kept, device id cleared), or gets a new row.
- If an account already has the same email, and Google says the email is
  verified, that account becomes the Google account and its password is
  removed. Email sign-up never verified addresses (ADR 0010), so whoever
  set that password may not own the address; the person Google vouches
  for does.
- Session tokens now carry the account's `users.session_version`, and a
  token whose version doesn't match is refused (`session_expired`). Taking
  an account over with Google bumps the version, so sessions issued to
  whoever registered the address end at once instead of lasting their 30
  days. This replaces ADR 0010's "tokens are stateless" consequence; tokens
  issued before versions existed count as version 0 and keep working.

## Consequences

- Testing needs an installed Android build (Play internal testing, or a
  locally built APK); Expo Go shows that Google sign-in isn't available.
- Firebase must know every key the app is signed with: the upload key and
  Play's app-signing key (Play Console → App integrity). A missing SHA-1
  makes Google sign-in fail only for installs from Play.
- `google-services.json` and the web client ID identify the Firebase
  project but aren't secrets; they're safe in the repo and the app bundle.
- Signing in with Google to an account the phone isn't on leaves a guest's
  data on the guest row, as with email (ADR 0010); the merge is still a
  follow-up.
