# Estimate — Autocomplete a book

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, node:test API tests with fake providers, Playwright acceptance tests through the `AddBookPage` page object, and review fixes. They exclude the requirements, mocks, design system page, CRD and this design. `ApiClient`, `ShelfApi`, `sh-cover`, `sh-cover-picker`, `processCover`, `requireSession`, `csrfGuard` and `passwordSignInLimiter` are assumed present and reused. No Open Library or Anthropic account is needed to build or test: the tests swap in fakes. [Detailed design](../../detailed-designs/books/autocomplete-book/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `book-search.service.ts`: `BookMatch`, `matchSchema`, `searchBooks` with catalogue-first, AI fallback, timeouts and `lookup-unavailable` | 3 |
| `catalogue.ts`: `openLibrary` search and `fetchCatalogueCover` (fixed host, 5 MB cap, 5 s, `processCover`) | 3 |
| `ai.ts`: `claudeSuggestions` over `fetch`, JSON answer parsed through `matchSchema`, not-configured path | 2 |
| `book-search.router.ts`, `lookupLimiter` over the existing `rateLimiter`, `createApp` options | 2 |
| `sh-combobox` (combobox and listbox roles, keyboard, announcements, notes, badge, covers) per the CRD | 5 |
| `ApiClient` abort and blob support; `ShelfApi.searchBooks` and `catalogueCover` | 1 |
| `AddBookPage`: debounce, abort, option mapping, pick-to-fill, focus to Chapters, cover as `File` | 3 |
| API tests (session, limit, validation, providers, fallback, failure, cover rules) and Playwright acceptance tests (typing, keyboard and ARIA, pick and save with cover, suggested, empty, failed, manual add) | 9 |
| **Total** | **28** |

## Minimal scope

Catalogue only: the search route over Open Library with the session guard and limit, the combobox with keyboard support, and a pick that fills the title and author. No AI fallback, no cover fetch, no chapter count. This still satisfies `L2-069`, `L2-073`, `L2-074` (without the AI branch) and `L2-075`, and most of `L2-070`; it defers `L2-071` and `L2-072`. Total: 17 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No AI fallback | Titles the catalogue does not know get "No matches"; no chapter count is ever filled | 3 |
| No cover fetch | The list shows placeholders and a pick fills no picture | 4 |
| No lookup rate limit | An abusive client can relay unlimited catalogue and AI calls through the API | 1 |
