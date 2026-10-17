# Reset a forgotten password

## Overview

Shelfie is a web application that helps one child read books by logging each chapter she reads and answering short questions about it, while a grown-up in the same household reviews her answers and gives rewards. A **household** is the unit of tenancy: exactly one reader profile and one grown-up profile, sharing one bookshelf.

The grown-up signs in with an e-mail address and a password. When he forgets the password, this feature lets him choose a new one without anyone's help. He enters his e-mail on the **Forgot password** page and Shelfie sends a **reset link** to that address through an external e-mail provider over SMTP. The link carries a **reset token**, a random secret that is valid for 1 hour and can be used once. Opening the link shows the **Reset password** page, where he types a new password of at least 8 characters twice; on success every other session of his is ended, he is signed in on the device he used, and Review opens.

The Forgot password page gives the same answer whether or not the e-mail belongs to an account: "If marcus@example.com has a Shelfie account, a reset link is on its way." This keeps the page from confirming which addresses exist. The token itself is never stored; only its hash is, so a copy of the database does not yield working links.

The feature sits in the `sign-in` subsystem beside PIN sign-in, password sign-in, session management and route authorisation. It is the only part of Shelfie that sends e-mail.

## Description

The slice runs from two pages in the sign-in library to the `password_reset`, `profile` and `session` tables, with one call out to the e-mail provider.

- **`ForgotPasswordPage`** — page component in the `sign-in` library at `/forgot-password`. One `sh-text-field` for the e-mail (autofocused), a Send reset link `sh-button` and a Back to sign in link. It owns the `default`, `invalid`, `submitting`, `success` and `error` states in `docs/mocks/pages/forgot-password/`. A malformed e-mail shows the "Check one thing" summary and field error without sending. On success it shows "Check your e-mail" with the entered address, the 1-hour validity and a "send it again" link that resubmits. When the server does not answer it shows "The e-mail couldn't be sent" with Try again, keeping the address.
- **`ResetPasswordPage`** — page component in the `sign-in` library at `/reset-password`, opened from the e-mailed link `/reset-password?token=<token>&email=<address>`. The `email` parameter is display only ("For marcus@example.com"); the server reads only the token. Two `sh-text-field`s, New password (help text "At least 8 characters. A short sentence works well.") and Type it again, and a Save new password `sh-button`. Client-side validation enforces the 8-character minimum and equality, showing the "Fix 2 things" summary and inline errors. On a `reset-token-invalid` response it shows the `error` state "This link has expired" with a Send a new link action to `/forgot-password`. On success it shows "Password updated — You're signed in on this device" with Go to Review. The brief lists no endpoint for checking a token before submission, so the `error` state appears on submit; there is no check at page open.
- **`AuthApi`** — `forgotPassword(email)` posts to `/api/auth/forgot-password`; `resetPassword(token, password)` posts to `/api/auth/reset-password` and returns a `Session`.
- **`auth.router.ts`** — `POST /api/auth/forgot-password` validates with `forgotPasswordSchema` (`email: string, e-mail format`) and always answers `202` with an empty body. `POST /api/auth/reset-password` validates with `resetPasswordSchema` (`token: string`, `password: string, at least 8 characters`, `confirm` equal to `password`) and answers `200 {session}` with `Set-Cookie shelfie_session` and, when the device cookie is absent, `Set-Cookie shelfie_device`. Both endpoints require no session.
- **`auth.service.ts`** — `requestPasswordReset(email)`: finds the grown-up by e-mail; when found, generates 32 random bytes, stores the SHA-256 hash of their base64url form in `password_reset` with `expires_at` = now + 1 hour, and sends the mail. When not found it returns after the same work minus the insert and send, so both outcomes look alike to the caller. `resetPassword(token, password, deviceId)`: hashes the token, loads the matching row where `used_at IS NULL` and `expires_at` is in the future, otherwise fails with `reset-token-invalid`; hashes the password with argon2id, updates `profile.password_hash`, sets `used_at`, deletes every session of the profile (`L2-004`), creates a new session and ensures a device row, all in one transaction.
- **Mail transport** — a `nodemailer` SMTP transport created in `auth.service.ts` from environment variables (`SMTP_URL`, `MAIL_FROM`, `APP_URL`); locally `SMTP_URL` points at a Mailpit sink, and the production provider is deferred (AGENTS.md, Deferred work). The message is plain text with the link; the token never appears in logs (`pino` logs route and status only).
- **`auth.repo.ts`** — `findGrownUpByEmail`, `createPasswordReset`, `findPasswordResetByHash`, `markPasswordResetUsed`, `updatePasswordHash`, `deleteSessionsForProfile`, `createSession`, `createDevice`.
- **`password_reset`** table: `token_hash`, `profile_id`, `expires_at`, `used_at NULL`. **`profile`** columns used: `id`, `household_id`, `email`, `password_hash`. **`session`** and **`device`** as in sign-in-with-password.

The mock's success state signs the grown-up in on the device and offers Go to Review, where `L2-004` says sign-in is offered; the design follows the mock, creating the new session after all existing ones are deleted, so that the invalidation in criterion 5 still holds for every other device.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-004` | `L1-001` | The grown-up can request a reset link by e-mail and set a new password. Any well-formed e-mail submitted on Forgot password shows the same success message whether or not the account exists; a valid single-use reset link with a new password of at least 8 characters entered twice identically changes the password and offers sign-in; a used or expired link shows an error state with an option to request a new link; mismatching or too-short passwords show inline errors; a completed reset invalidates all existing grown-up sessions. |

## Diagrams

### System context

The grown-up asks Shelfie for a reset link; Shelfie hands the message to the external e-mail provider, which delivers it to him.

![C4 system context for resetting a password](diagrams/c4-context.png)

### Containers

The two pages in the Angular application post to the Express API, which stores the token hash in the SQLite database and sends the link over SMTP.

![C4 container view for resetting a password](diagrams/c4-container.png)

### Components

Inside the API, the auth router validates both bodies and delegates to `auth.service.ts`, which uses `auth.repo.ts` for the reset row, the password hash and the sessions, and the mail transport for delivery.

![C4 component view for resetting a password](diagrams/c4-component.png)

### Class structure

`ForgotPasswordPage` and `ResetPasswordPage` call `AuthApi`; the service creates and consumes `PasswordReset` rows and replaces the grown-up's `Session`s.

![Class diagram for resetting a password](diagrams/class-structure.png)

### Behaviour — request a reset link

The page validates the address, the API records a hashed token and sends the link when the account exists, and the same success message is shown either way (`L2-004`).

![Sequence diagram for requesting a reset link](diagrams/sequence-request-reset-link.png)

### Behaviour — reset the password

The page enforces length and match, the API consumes the token once, replaces the hash, deletes every session and signs the grown-up in on this device; a used or expired token yields the error state (`L2-004`).

![Sequence diagram for resetting the password](diagrams/sequence-reset-password.png)
