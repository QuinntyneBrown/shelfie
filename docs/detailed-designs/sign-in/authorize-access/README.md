# Authorize access

## Overview

Shelfie is a web application that helps one child read books by logging each chapter she reads and answering short questions about it, while a grown-up in the same household reviews her answers and gives rewards. A **household** is the unit of tenancy: exactly one reader profile and one grown-up profile, sharing one bookshelf.

Two people with two roles share one application, and households never see each other. This feature is the set of rules that keeps those boundaries. **Authorisation** decides, for each page and each API request, whether the current session may proceed. A request without a session is refused with `401` and the application returns to sign-in. A request from the reader for a grown-up area (Review, Books, Manage book, Settings) is refused with `403` and the application shows the **Grown-ups only** page. An address that matches no page shows the **Not found** page with a link home. An unexpected failure inside the API answers `500` with a generic problem and a **request id**, and the application shows the **Something went wrong** page with a retry action and that id, never a stack trace.

**Household isolation** is the second half of the rule: every row a person can reach belongs to their own household. Every repository query is scoped by `household_id`, so an id that belongs to another household is indistinguishable from an id that does not exist, and both answer `404`. The API never answers `403` for a foreign id, because a `403` would confirm that the id exists.

The feature sits in the `sign-in` subsystem beside PIN sign-in, password sign-in, session management and password reset. Every other feature relies on it: the guards on the routes, `requireRole()` on the endpoints and the household scope in the repositories.

## Description

The slice has a frontend half (route guards and three error pages) and a backend half (the role guard, the error mapping and the repository convention).

- **`authGuard`** — `CanActivateFn` in the `core` library. It awaits `SessionService.restored`, then allows the route when a session exists and otherwise redirects to `/sign-in` (`L2-005`).
- **`grownUpGuard`** — `CanActivateFn` in the `core` library applied after `authGuard` on `/review`, `/review/**`, `/books`, `/books/:id/manage` and `/settings`. A `reader` session is redirected to `/forbidden` (`L2-005`).
- **`app.routes.ts`** — in the `shelfie` application: protected routes carry the guards; `/forbidden`, `/error` and the wildcard `**` route to the three pages below.
- **`NotFoundPage`**, **`ForbiddenPage`**, **`ServerErrorPage`** — page components in the `sign-in` library, each one `sh-error-state` inside the shell with the top bar of the current role. Not found: "We can't find that page" with a home link, Back to my shelf for the reader or Go to Review for the grown-up. Grown-ups only: "This part is for grown-ups" with Back to my shelf and Switch reader (the manage-session sign-out, returning to the picker). Something went wrong: "Something went wrong on our side" naming the request id as "code SHF-…", a Try again action that navigates to the URL that failed, and the role's home link.
- **`sh-error-state`** — component in the `components` library: large icon, heading, body and an actions slot; used by every page's `error` state as well.
- **`GlobalErrorHandler`** — Angular `ErrorHandler` in the `core` library. When an unhandled `ApiError` has status `500` or higher, or a route resolver throws, it navigates to `/error?requestId=<id>&from=<url>`; pages that catch their own load failure keep their inline `error` state instead.
- **`ApiClient`** — maps responses to `ApiError{status, problem}`; a `401` clears the session and navigates to sign-in (manage-session); a `403` navigates to `/forbidden`; a `404` is thrown to the page, which shows the Not found page for a missing book or chapter.
- **`requireRole(role)`** (`platform/authz.ts`) — Express middleware. Without `req.session` it answers `401` with problem type `no-session`, or `session-expired` when `sessionMiddleware` flagged an expired cookie. With a session whose role is `reader` on a `grown_up` route it answers `403` with type `grown-ups-only`. Routes marked `R` in the brief use `requireRole('reader')`, which admits both roles; routes marked `G` use `requireRole('grown_up')`.
- **`problemDetailsHandler`** (`platform/errors.ts`) — maps `NotFoundError` to `404` type `not-found`, and any other thrown error to `500` type `about:blank` with `title: "Something went wrong"` and the `requestId`, logging the error with that id and never the stack in the body (`L2-005`).
- **Repository convention** — every `*.repo.ts` function that reads or writes a household-owned row takes `householdId` from `req.session` as its first parameter and includes `household_id = ?` in the statement, joining through `book` for `question`, `chapter_log`, `answer` and `reward`. A miss returns `undefined`, and the service throws `NotFoundError`; a foreign id therefore answers `404` with no data (`L2-006`). A reader asking for a chapter of a book outside her household follows the same path.
- **Acceptance fixture** — the Playwright setup seeds two households, so the isolation tests can request a second household's book, chapter and reward ids from the first household's reader and grown-up sessions.

The forbidden mock's note proposes that the same page serve a grown-up who opens another household's link, with the copy "That book belongs to another family"; the API answers `404` for a foreign id (`L2-006`), so the web shows the Not found page, whose copy already allows for a removed book, and that variant is not built.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-005` | `L1-002` | Route authorisation. Given no session, any protected page or API request sends the user to sign-in and the API returns 401; given a reader session, opening Review, Books, Manage book or Settings by URL shows the "Grown-ups only" page and the API returns 403; an unknown URL shows the Not found page with a link home; an unexpected server failure on page load shows the Something went wrong page with a retry action and no stack trace. |
| `L2-006` | `L1-002` | Household data isolation. Given two households, a request from household A for an id belonging to household B answers 404 and returns no data from B; a reader requesting another book's chapter that is not in her household is refused. |

## Diagrams

### System context

Both people are authorised by Shelfie on every page and request; a second household exists only as something they can never reach.

![C4 system context for authorising access](diagrams/c4-context.png)

### Containers

Route guards in the Angular application decide what renders; `requireRole()` and household-scoped queries in the Express API decide what the SQLite database returns.

![C4 container view for authorising access](diagrams/c4-container.png)

### Components

Inside the API, `sessionMiddleware` resolves the session, `requireRole()` refuses with `401` or `403`, repositories scope every query by `household_id`, and `problemDetailsHandler` turns misses and failures into `404` and `500` problems.

![C4 component view for authorising access](diagrams/c4-component.png)

### Class structure

The guards and `GlobalErrorHandler` read `SessionService` and route to the three pages; on the backend `requireRole` reads `req.session` and the repositories take `householdId`.

![Class diagram for authorising access](diagrams/class-structure.png)

### Behaviour — authorise a route in the web application

Opening a URL runs `authGuard` and `grownUpGuard`; the alternatives show sign-in, Grown-ups only, Not found and Something went wrong (`L2-005`).

![Sequence diagram for authorising a route](diagrams/sequence-authorize-route.png)

### Behaviour — authorise an API request and isolate the household

The API refuses missing sessions and wrong roles, scopes the query by household, and answers `404` for a foreign id and `500` with a request id for an unexpected failure (`L2-005`, `L2-006`).

![Sequence diagram for authorising an API request](diagrams/sequence-authorize-request.png)
