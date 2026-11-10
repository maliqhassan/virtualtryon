# 14. A guest's things move into the account they sign in to

Date: 2026-11-11

Status: Accepted. Resolves the follow-up left open in ADR 0010 and ADR
0012 ("the merge is still a follow-up").

## Context

A new Google account already takes over the caller's guest row (ADR 0012),
so nothing a guest made is lost. Signing in to an account the person
already had did not: their guest pieces, photos, try-ons and looks stayed
on the guest, out of reach once the phone used the account's session.
Handoff v2.1 asks for sign-in to merge guest data into the account. Google
stays the only sign-in in the app (change 1's email screen was declined),
so the merge is built for Google sign-in.

## Decision

- When `POST /auth/google` signs in to an existing account (a known Google
  user, or an email account Google takes over) and the caller is an
  unclaimed guest, everything the guest owns moves to the account in the
  same transaction as the sign-in: wardrobe pieces, photos, try-ons and
  saved looks. Then the emptied guest row is deleted.
- Every table pointing at `users.id` is moved, read from the models, so a
  table added later can't make the guest's deletion fail.
- The account's own style profile wins; the guest's moves only if the
  account has none, otherwise it is deleted and moved try-ons point at the
  account's profile.
- Photos stay one per view, as uploads keep them: the newest of each view
  is kept and the others' files are deleted after the commit.
- Both user rows are locked first, so no try-on can start on either while
  things move. If the move fails, sign-in fails rather than signing in
  without the guest's things.
- Only an unclaimed guest is merged, and only after Google's token is
  verified. A caller who is already signed in to another account is never
  merged.
- Stored files don't move: storage keys aren't per user, only rows change
  owner (`GuestMergeRepository`).
- Moved try-ons count toward the account's allowance, so a guest can't be
  used to get extra free try-ons.

## Consequences

- The guest's device id no longer exists; a phone that sends it again gets
  a fresh guest, as after any sign-in.
- The newest photo becomes "My photo", so a photo just taken as a guest
  replaces the account's older one as the one in use.
- On a shared phone, whoever signs in takes the guest's things, body
  photos included, as a new account already did (ADR 0012). The guest is
  whoever used this phone without signing in, so there is no one else to
  ask; signing in on someone else's phone is the person's choice.
- `POST /auth/email` (unused by the app) doesn't merge.
