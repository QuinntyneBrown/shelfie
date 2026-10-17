# Estimate — Harden the API

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `supertest`, and review fixes. They exclude the requirements and this design. The Express application skeleton, `db.ts` with the migration runner, `logger.ts` and `requestContext` are assumed present from the sibling `operate-service` feature; the module routers, schemas and repositories that use `validate()`, `requireRole()` and `hashSecret()` are paid for by their own features. The session idle timeout is 30 days; the reverse proxy marked `<TO SUPPLY>` is assumed to be a single configuration file for a proxy already available on the host, and its installation is not costed. [Detailed design](../../detailed-designs/platform/harden-api/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `app.ts` middleware order, `helmet` configuration (CSP, nosniff, frame-ancestors, HSTS), 16 kB JSON limit, `Cache-Control: no-store` | 2 |
| `session.ts`: `session` migration, `sessionMiddleware`, `issueSession` with id rotation and cookie attributes, `revokeSession` | 3 |
| `csrf.ts`: `csrfGuard` on `Sec-Fetch-Site`, `Origin` and `X-Requested-With: Shelfie`; `ApiClient` header | 1 |
| `rateLimit.ts`: `passwordSignInLimiter` with `trust proxy` setting | 1 |
| `validate.ts`: zod middleware producing 400 with `errors[]` | 2 |
| `hashing.ts`: argon2id `hashSecret` / `verifySecret` | 1 |
| `errors.ts`: `Problem`, `HttpError`, `problemDetailsHandler` with no stack, SQL or path in the body | 2 |
| `logger.ts` redaction paths and no-body policy | 1 |
| `ON DELETE CASCADE` foreign keys in migrations and `PRAGMA foreign_keys = ON`; reverse-proxy TLS configuration | 1 |
| API tests: headers present, cross-site and header-less requests rejected, 11th sign-in gets 429, invalid body gets `errors[]`, 500 body has no stack, cascade delete removes child rows, session id changes on sign-in | 3 |
| **Total** | **17** |

## Minimal scope

`helmet` with its default headers plus `frame-ancestors`, the session cookie with `HttpOnly`, `Secure` and `SameSite=Strict`, argon2id hashing, `validate()` and `problemDetailsHandler`, parameterised repositories and the cascade. This still satisfies `L2-027` criteria 1, 2 and 5, all of `L2-028` and `L2-029` criteria 1 and 3, relying on `SameSite=Strict` alone as the CSRF defence. It defers `L2-027` criterion 3 (`csrfGuard`), criterion 4 (the rate limit) and `L2-029` criterion 2 (log redaction). Total: 12 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `csrfGuard`; rely on `SameSite=Strict` cookie only | Second, independent CSRF defence; `L2-027` criterion 3 rests on one control | 1 |
| Drop `passwordSignInLimiter` | Password guessing is slowed only by argon2id cost; `L2-027` criterion 4 is not met | 1 |
| Drop `logger.ts` redaction and rely on never logging bodies | A future log statement that includes a body leaks credentials; `L2-029` criterion 2 rests on convention | 1 |
| Reduce API tests to headers, validation and cascade only | CSRF, rate-limit and session-rotation behaviour is unverified | 1 |
