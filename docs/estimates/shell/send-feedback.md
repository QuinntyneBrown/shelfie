# Estimate — Send feedback

## Basis

Hours for an intermediate Angular/TypeScript developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through page objects (Chromium only), the admin CLI command and its test, and review fixes. They exclude the requirements, mocks, design system and this design. `sh-dialog`, `sh-sticker-picker`, `sh-segmented`, `sh-textarea`, `sh-banner`, `ToastService`, the admin API guard and audit, and the CLI's query plumbing are assumed present. [Detailed design](../../detailed-designs/shell/send-feedback/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Migration `009-feedback.sql`, `feedback.service.ts`, `feedback.router.ts`, `feedbackLimiter`, API tests (save, validation, session, CSRF, rate limit, isolation) | 3 |
| `SendFeedbackDialog`, `FeedbackApi` and the account menu item (score, kind, message, count, invalid, busy, failed, toast) | 4 |
| Playwright acceptance tests via `SendFeedbackDialogPage` and `ShellPage` (reader, parent, close, invalid, busy, failed) | 2 |
| `GET /api/admin/v1/feedback`, admin test, `admin-api.yaml`, `shelfie-admin feedback list` and its CLI test | 2 |
| Erasure test and runbook line | 1 |
| **Total** | **12** |

## Minimal scope

The score and message only, with no kind; the API, the dialog and the admin list kept. Saves about 1 hour and drops the kind from `L2-115`.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the CLI command; read with `curl` on the admin API | `L2-118` criterion 3 | 1 |
| Drop the characters-left count | Readers learn the limit only on Send | 0.5 |
