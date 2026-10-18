# Estimate — Suggest questions

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, node:test API tests, Playwright acceptance tests through page objects with a fake provider, and review fixes. They exclude the requirements, mocks, design system pages and this design. `POST /api/books/:id/questions`, `ToastService`, `sh-dialog`, `sh-banner`, `sh-empty-state`, `sh-skeleton`, `requireSession`, `requireRole`, `csrfGuard` and the sign-in rate limiter are assumed present and reused. [Detailed design](../../detailed-designs/books/suggest-questions/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `suggestions.ts`: `anthropicSuggester` (fetch, JSON schema output, refusal, 20 s timeout) and `suggestQuestions` (next chapter, filtering) | 4 |
| Route with 503, 502 and 404 mapping; `rateLimiter` generalised for 5 asks per household; `createApp` and `main.ts` wiring | 3 |
| `sh-suggestion` component (checkbox, editable wording, error, disabled, focus) | 2 |
| `SuggestQuestionsDialog`: busy, suggestions, empty, failed, unavailable, invalid, saving, partial failure, toast; "Suggest questions" on Manage a book | 6 |
| API tests (parent only, filtering, failure, timeout, unavailable, rate limit, privacy of the request) | 7 |
| Playwright acceptance tests through a fake provider (ask, keep and reword, next chapter asks them, empty, failed with retry, unavailable, invalid) | 10 |
| **Total** | **32** |

## Minimal scope

Ask and keep only: suggestions arrive, the parent ticks and adds them, failures show one generic message and no Try again. No rewording in place (the parent edits after adding), no rate limit. This satisfies `L2-064`, `L2-065` criteria 1, 2, 4, 6 and 7, `L2-066` criteria 1–3 and 6, `L2-067` and `L2-068` criteria 1–4. Total: 20 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No rewording in the dialog | The parent edits a kept question with Edit afterwards | 3 |
| No partial-failure handling | A failed save part-way shows the generic failure; the parent checks the list | 2 |
| No per-household rate limit | Cost is only bounded by the provider's own limits | 3 |
