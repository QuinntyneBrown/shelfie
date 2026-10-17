# Manage a session

## Overview

Shelfie is a web application that helps one child read books by logging each chapter she reads and answering short questions about it, while a grown-up in the same household reviews her answers and gives rewards. A **household** is the unit of tenancy: exactly one reader profile and one grown-up profile, sharing one bookshelf.

A **session** is the record that a person has signed in: a server-side row in the `session` table, referenced by the HttpOnly cookie `shelfie_session`, holding the profile it belongs to and the time it expires. Sign-in with a PIN or a password creates one; this feature covers everything that happens to it afterwards.

A session has an **idle timeout** of 30 days: each authenticated request moves `expires_at` to 30 days from now, and a session with no activity for 30 days expires. Once it has expired, the next action the person takes is refused by the API and the application returns to the sign-in page with the message "You were signed out", so nobody wonders why the shelf vanished.

The **account menu** opens from the avatar in the top bar. The reader's menu offers "Switch reader" and "Sign out"; the grown-up's menu adds "Settings". Both "Switch reader" and "Sign out" end the session on the server and return to the **profile picker**, the first step of the sign-in page. After signing out, pressing the browser's Back button shows no protected data: the application holds no session in memory, every protected route redirects to sign-in, and API responses are marked not to be cached.

On every application start the web application asks the API whether a session exists, so that a returning person lands on the page they asked for without signing in again, and an absent or expired session is discovered before any protected page renders.

The feature sits in the `sign-in` subsystem beside PIN sign-in, password sign-in, password reset and route authorisation.

## Description

The slice runs from the account menu and the application start-up to the `session` table.

- **`SessionService`** — service in the `core` library holding the current session as a signal (`householdId`, `profileId`, `role`, `name`, `color`). `restore()` runs once at application start through `provideAppInitializer`, calls `AuthApi.session()` and sets the signal or leaves it `null`. `clear()` sets it to `null`. Route guards (authorize-access) read the signal after `restore()` has settled.
- **`ApiClient`** — typed `fetch` wrapper in the `core` library. On a `401` whose problem `type` is `session-expired` it calls `SessionService.clear()` and navigates to `/sign-in?reason=expired`; on a `401` of type `no-session` it clears and navigates to `/sign-in`.
- **`SignInPage`** — when the route carries `reason=expired` it renders the `expired` state: an `sh-banner` above the picker with "You were signed out" and the explanatory sentence, followed by the picker as usual.
- **`sh-menu`** — component in the `components` library: a popover list of `menuitem` entries anchored to a trigger. It opens on Enter, Space or ArrowDown, moves with the arrow keys, closes on Escape and returns focus to the trigger. The account menu is the `sh-menu` that `sh-top-bar` (shell subsystem) opens from the avatar; its header shows the profile name and, for the reader, her streak, or, for the grown-up, his e-mail and role. Items: Settings (grown-up only, navigates to `/settings`), Switch reader, Sign out.
- **`AuthApi`** — `session()` gets `/api/auth/session` and returns a `Session` or throws `ApiError`; `signOut()` posts to `/api/auth/sign-out`. Both menu items call `signOut()`, then `SessionService.clear()`, then navigate to `/sign-in`; the mock shows no further difference between the two items, and any further difference is `<TO SUPPLY>`.
- **`sessionMiddleware`** (`platform/session.ts`) — reads `shelfie_session`, loads the row. When `expires_at` is in the past it deletes the row, clears the cookie and records `req.sessionExpired = true` so that `requireRole()` answers `401` with `type: "session-expired"` rather than `no-session`. Otherwise it sets `req.session` (`id`, `profileId`, `householdId`, `role`).
- **`auth.router.ts`** — `GET /api/auth/session` (reader or grown-up) returns the profile summary of `req.session`. `POST /api/auth/sign-out` deletes the session row, sets an expired `shelfie_session` cookie and answers `204`; it passes `csrfGuard` like every state-changing request.
- **`auth.service.ts`** — `currentSession(sessionId)` and `signOut(sessionId)`.
- **`auth.repo.ts`** — `findSession`, `deleteSession`, `deleteExpiredSessions` (run at start-up to keep the table small).
- **`app.ts`** — sets `Cache-Control: no-store` on every `/api` response, so Back after sign-out cannot replay a protected response from the browser cache (`L2-003`).
- **`session`** table: `id`, `profile_id`, `created_at`, `expires_at`; `expires_at` is the time of the last authenticated request plus 30 days, written by `sessionMiddleware`.

The `expired` message and the no-store header together satisfy the two user-visible promises: the person is told why they were signed out, and nothing protected remains on screen afterwards.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-003` | `L1-001` | Sessions expire and the user is told why. Given a session with no activity for 30 days, any action sends the user to sign-in showing the "expired" message; after sign-out, Back displays no protected data; sign-out invalidates the server session; "Switch reader" in the account menu ends the session and shows the profile picker. |

## Diagrams

### System context

Both people hold sessions in Shelfie and end them from the account menu; the expiry is Shelfie's own rule.

![C4 system context for managing a session](diagrams/c4-context.png)

### Containers

The Angular application restores, uses and ends the session through the Express API, which keeps the session rows in the SQLite database.

![C4 container view for managing a session](diagrams/c4-container.png)

### Components

Inside the API, `sessionMiddleware` resolves the cookie to a row on every request, the auth router exposes the session and sign-out endpoints, and `auth.repo.ts` reads and deletes session rows.

![C4 component view for managing a session](diagrams/c4-component.png)

### Class structure

`SessionService` and `ApiClient` in the `core` library cooperate on expiry; `sh-menu` hosts the two sign-out items; the backend middleware and service share `AuthRepo`.

![Class diagram for managing a session](diagrams/class-structure.png)

### Behaviour — restore and expire a session

At application start the session is restored from the cookie; a later action against an expired session is refused, the row is deleted and the sign-in page shows the expired message (`L2-003`).

![Sequence diagram for restoring and expiring a session](diagrams/sequence-expire-session.png)

### Behaviour — sign out or switch reader

Either account-menu item deletes the server session, clears the in-memory session and returns to the picker; Back afterwards hits the route guard and finds nothing to show (`L2-003`).

![Sequence diagram for signing out](diagrams/sequence-sign-out.png)
