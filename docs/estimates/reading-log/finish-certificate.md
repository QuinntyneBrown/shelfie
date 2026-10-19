# Estimate — Finish certificate

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `getBook`, `readCover`, `requireSession`/`requireRole`, `BookPage`, `ReviewPage` and `ManageBookPage` are assumed present. [Detailed design](../../detailed-designs/reading-log/finish-certificate/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `certificate.service.ts`: pdfkit page (band, frame, name, title line, chapters line, long date, seal, cover picture), 409 for unfinished | 3 |
| `certificate.router.ts`: route, attachment headers, file name, problem mapping; mount in `app.ts` | 1 |
| API tests (PDF for a finished book and its headers, 409 unfinished, 404 other household) | 1 |
| "Print my certificate" on `BookPage`; "Print certificate" on `ReviewPage` and `ManageBookPage` | 1 |
| Playwright acceptance tests via `BookPage`, `ReviewPage` and `ManageBookPage` page objects (download from each entry point) | 2 |
| **Total** | **8** |

## Minimal scope

The route and service with text only (no cover picture, no seal) and the link on `BookPage` alone. Satisfies `L2-120` criteria 1 to 5 except the picture. Total: 5 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No cover picture on the paper; colour band only | The book's own picture on the certificate | 1 |
| Reader's book page link only | Dad printing from Review or Manage book | 2 |
