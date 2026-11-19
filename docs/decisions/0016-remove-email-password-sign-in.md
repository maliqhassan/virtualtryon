# 16. Email and password sign-in is removed

Date: 2026-11-19

Status: Accepted. Supersedes ADR 0010 (email and password sign-in).

## Context

ADR 0010 added `POST /api/v1/auth/email`, which signed up or signed in with
an email and password (argon2id hashes). Since then Google sign-in (ADR
0012) became the only way to sign in that the app offers: handoff v2.1's
direct email screen was declined, and the app has no password screen.

The endpoint stayed live anyway. Unused code that stores and checks
passwords is attack surface with no benefit: it accepts sign-ups nobody
can use from the app, and every attempt costs an argon2 hash.

## Decision

- `POST /auth/email` is removed, with its request schema, the
  password hashing helpers, the per-email lockout, and the `argon2-cffi`
  dependency.
- The `users.email` and `users.password_hash` columns stay, so no
  migration is needed. Accounts created through the old endpoint keep
  their rows and data.
- Such an account can still be reached by signing in with Google using the
  same, Google-verified address: the existing take-over (ADR 0012) turns
  it into that person's Google account, clears the password and ends its
  old sessions.
- Session tokens (`Authorization: Bearer`), the per-address and overall
  sign-in attempt limits, and Google sign-in are unchanged.

## Consequences

- An old email account whose address isn't a Google account can no longer
  sign in. This only affects accounts made during testing; the app never
  offered email sign-up to users.
- Adding email sign-in back later means a new ADR, and should reuse what
  is still here (the columns and the session tokens), not this endpoint as
  it was.
