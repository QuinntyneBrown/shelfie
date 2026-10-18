# Sign in with a password

## Overview

Shelfie is a web application that helps children read books by logging each chapter read and answering short questions about it, while a parent reviews the answers and gives rewards. A **household** is the unit of tenancy: any number of parents and any number of readers, sharing one set of bookshelves.

Only parents hold accounts. A **user** is one person in a household, with a role of `parent` or `reader`, a display name and a unique **username**. A parent creates a reader's username and password when adding the reader (manage-readers design). Every person, parent or reader, signs in on one page with a username and a **password**. A successful sign-in creates a **session** (a server-side row referenced by an HttpOnly cookie) and sends a parent to Review, where the readers' answers wait, and a reader to her shelf.

The sign-in form also carries a **Remember me** checkbox. The box decides whether the session outlives the browser. The lifetime rules belong to the session-management design (`L2-003`); this feature only passes the choice to the API.

Wrong credentials produce one generic failure that does not say whether the username or the password was wrong. The API rate limits repeated failures from one source, a control owned by the platform subsystem's harden-api design.

The feature sits in the `sign-in` subsystem beside sign-up, invite acceptance, session management, password reset and route authorisation. It is the entry point for every returning person.

## Description

The slice runs from the sign-in page to the `users` and `session` tables. The mock states are in `docs/mocks/pages/sign-in/`: `default`, `missing`, `invalid`, `submitting`, `error` and `expired`.

- **`SignInPage`** — page component in the `sign-in` library, titled "Welcome back". It renders a username field, a password field with a show/hide toggle, the Remember me checkbox (labelled "Keep me signed in", the mock wording; L2-003 calls it Remember me), a Sign in button, a "Forgot your password?" link to `/forgot-password` and a "Create a parent account" link to sign-up. The `expired` state shows an info alert, "You were signed out", after a session expires.
  - Before sending, the page validates the form. An empty username or password produces field-level errors, a summary alert ("Fill in 2 things") and no request (`L2-002`).
  - On submit the button enters its busy state and further presses send nothing (`submitting` state). Enter submits.
  - A `401` shows the `invalid` state: a summary alert ("We couldn’t sign you in") and the single message "Username or password is wrong." under the password field. The typed username is kept.
  - A network failure or a `5xx` shows the `error` state, an alert ("Can’t reach Shelfie") with a Try again action that resubmits (`L2-002`).
  - On success the page stores the session and navigates to `/review` for a parent or to the shelf for a reader.
- **`sh-text-field`**, **`sh-button`** and **`sh-alert`** — components in the `components` library. The library entries for the password toggle, the checkbox switch and the alert are listed in `docs/screen-composition.md`; `sh-text-field` with `type: 'password'` carries the Show password button, and `sh-banner` with `summary` is focusable for the failure summary.
- **`AuthApi`** — service in the `sign-in` library built on `ApiClient`. `signInWithPassword(username, password, remember)` posts to `/api/auth/password` and returns a typed `Session` carrying the role, or throws `ApiError`.
- **`SessionService`** — service in the `core` library; set from the response before the page navigates.
- **`auth.router.ts`** — Express router. `POST /api/auth/password` applies the sign-in rate limiter, validates the body with `passwordSignInSchema` (`username: string, at least 1 character`, `password: string, at least 1 character`, `remember: boolean`) through `validate()`, then calls the service.
- **`auth.service.ts`** — `signInWithPassword(username, password, remember)`: loads the user by username with a case-insensitive match, verifies `password` against `password_hash` with argon2id, and answers an unknown username and a wrong password with the same `credentials-invalid` failure. When the username is unknown it verifies against a fixed dummy hash so both paths take the same time. On success it creates a session whose lifetime follows `remember` and returns the user's role.
- **`auth.repo.ts`** — parameterised SQL over `users` and `session`: `findUserByUsername`, `createSession`.
- **`users`** table columns used: `id`, `household_id`, `role`, `name`, `username` (unique, case-insensitive), `password_hash`.
- **`session`** table: `id`, `user_id`, `created_at`, `expires_at`. The response sets cookie `shelfie_session` (HttpOnly, Secure, SameSite=Strict); a new session id is issued on every sign-in. The cookie persists past the browser only when `remember` is true (`L2-003`).

The error body for wrong credentials is a problem document with `type: "credentials-invalid"` and status `401`. A `429` from the rate limiter is shown in the summary slot with the copy "Too many tries. Wait 10 minutes and try again.", as no mock state exists for it.

State of the code: the existing implementation still follows the earlier model (e-mail sign-in, a profile picker and PINs). The username column, the `remember` flag and the role-based landing are not built yet.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-002` | `L1-001` | Every person, parent or reader, signs in with a username and password. Given a parent's correct username and password, when submitted, then the parent lands on Review. Given a reader's correct username and password, when submitted, then the reader lands on her shelf. Given a username that differs from the stored one only in letter case, when submitted with the correct password, then sign-in succeeds. Given an empty username or password, when submitted, then field-level errors are shown and no request is sent. Given wrong credentials, when submitted, then one generic "username or password is wrong" error is shown that does not reveal which was wrong, and the typed username is kept. Given a submission in flight, when the button is pressed again, then no second request is sent and the button shows a busy state. Given the server is unreachable, when sign-in is submitted, then an error state with a retry action is shown. |

## Diagrams

### System context

A parent or a reader signs in to Shelfie with a username and password.

![C4 system context for signing in with a password](diagrams/c4-context.png)

### Containers

The sign-in page in the Angular application posts credentials to the Express API, which verifies the password against the PostgreSQL database and sets the session cookie.

![C4 container view for signing in with a password](diagrams/c4-container.png)

### Components

Inside the API, the auth router applies the rate limiter and body validation, then delegates to `auth.service.ts`, which reads the user and inserts a session through `auth.repo.ts`.

![C4 component view for signing in with a password](diagrams/c4-component.png)

### Class structure

`SignInPage` composes `sh-text-field` and `sh-button` and calls `AuthApi`; the service verifies against `User` and creates a `Session`.

![Class diagram for signing in with a password](diagrams/class-structure.png)

### Behaviour — sign in as a parent or a reader

The happy path creates a session and navigates by role: a parent to Review, a reader to her shelf. The alternate paths show client-side validation, wrong credentials, the rate limit and an unreachable server (`L2-002`).

![Sequence diagram for signing in with a password](diagrams/sequence-sign-in-with-password.png)
