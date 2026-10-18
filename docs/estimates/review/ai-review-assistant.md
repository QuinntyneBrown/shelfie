# Estimate — AI review assistant

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through the `ReviewChapterPage` page object with a fake provider, and review fixes. They exclude the requirements, mocks and this design. Review a chapter, `requireRole`, `csrfGuard`, the sign-in rate limiter, `sh-banner` and `ApiClient` exist already. No real API key is needed. [Detailed design](../../detailed-designs/review/ai-review-assistant/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `review-assistant.ts`: `AssistInput`, prompt, output schema, `anthropicAssistant` over `fetch` with timeout and fallbacks, `checkAdvice`, `askAssistant` error mapping | 4 |
| `POST /api/chapter-logs/:id/assist` route; `createApp` `assistant` option; generalised `rateLimiter` and `assistLimiter` | 2 |
| API tests: parent only, pending only, household, validation and trimming, failure, timeout, not configured, rate limit, what is sent | 3 |
| `ReviewApi.assist`; `ReviewChapterPage` assist states, flags, Suggested note, Use draft, failed and unavailable banners | 4 |
| e2e fake provider and Playwright tests via `ReviewChapterPage` (busy, flags, nothing flagged, use draft and send, reader sees no flags, failed, unavailable, reviewed) | 3 |
| **Total** | **16** (2 days) |

## Minimal scope

Flags and the draft with "Use draft", a single failed state for every error (no separate "not set up"), and no rate limit beyond the session and CSRF guards. Satisfies `L2-064`, `L2-065`, `L2-066`, most of `L2-067` and `L2-068` except criterion 3. Total: 12 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the separate "isn’t set up" state | A parent without a key sees "couldn’t help" and a useless Try again | 1 |
| Drop the assist rate limit | One parent can run up provider cost with repeated presses | 1 |
| Drop flags; keep only the draft | No pointer to the answers worth talking about | 2 |
