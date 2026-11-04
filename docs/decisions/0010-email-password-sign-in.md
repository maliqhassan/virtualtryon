# 10. Email and password sign-in on our own backend

Date: 2026-11-04

Status: Accepted. Adds to ADR 0009; Google and Apple stay on Firebase as
decided there.

## Context

The v2 design (`design_handoff_ai_stylist/04-react-native.md` §2) adds a
"Continue with email" screen: email and password on one screen, with no
code and no verification link. A new email creates the account, a known
email signs in. ADR 0009 chose Firebase for Google and Apple sign-in only,
and none of it is built yet. Phase B of the roadmap had already planned
email and password on this backend (argon2, signed tokens, guest claiming).

## Decision

Email and password accounts live in our own database, not Firebase:

- `users` gains `email` (unique, stored lower-cased) and `password_hash`.
  Passwords are hashed with argon2id (argon2-cffi defaults), 8 to 128
  characters.
- `POST /api/v1/auth/email` does both sign-up and sign-in. When a guest
  signs up, its row becomes the account, so everything it made is kept.
  The row's device id is cleared at the same moment, so the account is
  reached only with its token from then on.
- The app gets a JWT (HS256, signed with `SECRET_KEY`, 30 days) and sends
  it as `Authorization: Bearer`. `get_current_user` accepts either a token
  or a guest device id; an invalid token is refused with
  `session_expired`, never silently treated as a new guest.
- Attempts are limited per network address and overall (every attempt
  costs an argon2 hash), and wrong passwords per email (only failures
  count, so correct sign-ins never lock an account). All in memory, like
  the link-import limits, and checked before any password work. Sign-in
  never creates a guest row of its own: a caller with no guest gets a new
  account row directly.
- Production refuses to start with a `SECRET_KEY` shorter than 32
  characters.

Why not Firebase for email too: it works in Expo Go only through the web
SDK, it would add a second identity system before the first exists, and
the backend already owns every user row. Google and Apple go through
Firebase later, which proves identity and then maps onto these same rows.

## Consequences

- No email verification, as designed. Anyone can register an address they
  don't own; nothing is sent to that address, so the only cost is that the
  real owner later finds it taken. Password reset needs a way to prove
  ownership (an emailed code), so "Forgot password?" stays out of scope.
- One screen for both cases tells anyone whether an email has an account
  (a wrong password says so). That is inherent in the design; the attempt
  limits keep it from being a fast lookup.
- Tokens are stateless: signing out deletes the token on the phone, and a
  stolen token works until it expires. Server-side revocation (a token
  version on the user) comes with "sign out everywhere" or account
  deletion.
- Signing in to an existing account from a guest leaves that guest's data
  on the guest row, and once the phone signs out it can't be reached. A
  merge (or a cleanup job for unreachable guest rows) is a follow-up.
- Ten wrong passwords lock an email for 15 minutes, so someone guessing
  from many addresses can keep a real user locked out; the fix, when it
  matters, is an emailed unlock code, which needs email sending.
