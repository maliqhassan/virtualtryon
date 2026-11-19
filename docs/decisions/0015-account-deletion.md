# 15. Deleting an account removes the account itself

Date: 2026-11-19

Status: Accepted.

## Context

"Delete all my data" (Settings) removes photos, wardrobe, saved looks, the
style profile and every stored image, but deliberately keeps the user row
and the try-on history: the row is the identity the app keeps using, and
the redacted try-on rows are what the free allowance counts, so clearing
your data can't buy another free try-on.

That isn't account deletion. The row keeps the person's email and Google
(Firebase) id, and Google Play requires an app with accounts to let people
delete the account itself, not only its contents.

## Decision

- New `DELETE /api/v1/account` deletes everything "Delete all my data"
  deletes, then the try-on history and the user row, in one transaction;
  stored files are deleted after it commits. `DELETE /account/data` stays
  as it was, for people who want a clean slate but to keep the account.
- Rows are removed from every table pointing at `users.id`, read from the
  models (`app/db/repositories/ownership.py`, shared with the guest merge
  of ADR 0014), so a table added later is deleted too instead of being left
  behind.
- The try-on history isn't kept to protect the free allowance. That
  protection only matters while the account exists: anyone can already get
  a new free try-on as a new guest on a fresh install, so keeping rows
  of a deleted account would hold personal history for no real gain.
- A Google account must confirm with a fresh Google sign-in: the request
  carries a Firebase ID token whose user matches the account and whose
  `auth_time` (the actual Google sign-in, not the hourly token refresh) is
  at most 5 minutes old. Otherwise `403 confirmation_required`. A stolen
  session token alone therefore can't delete an account. Guests, who have
  nothing to re-confirm with, delete with their device id alone.
- The user row is locked first, so a try-on or upload can't add rows while
  the account is removed.
- On the phone, after the server succeeds, the app deletes the Firebase
  user too (Firebase allows that right after a sign-in), then forgets the
  session, the guest id, local per-person state and the "intro seen" flag,
  and returns to the welcome screen. Deleting the Firebase user is best
  effort: our data is already gone, and Firebase holds only the account's
  id and email.

## Consequences

- Signing in with the same Google account later creates a new, empty
  account.
- Deleting from the server alone (Firebase Admin SDK with a service
  account) was considered and rejected for now: it needs a new secret on
  the server and a large dependency, while the phone can do it at the one
  moment Firebase allows.
- Not yet done: Google Play also asks for a web page where people can
  request deletion without the app. That needs a contact address and is
  part of the Play release work.
