# ADR-0008: Look books up through the API, with Open Library first and an AI fallback

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-074, L2-076, L2-077, L2-079, L2-080

## Context

Add a book asks for a title, an author, a chapter count and an optional cover picture (`L2-009`, `L2-046`). Item 2 of `docs/feature-enhancements.md` asks that typing a title should find the book and fill the rest in, "using a book catalogue with AI fallback". Four questions needed an answer: which catalogue, who calls it, what the AI is for, and where a chapter count comes from.

The reader is nine. Whatever is filled in is shown to her as the book's facts, so a guess presented as a fact would be worse than an empty field.

## Decision

1. **Open Library is the catalogue.** Its search API (`https://openlibrary.org/search.json`) is public, needs no key, returns title, author and a cover id, and its cover host serves the picture. No other catalogue is used.
2. **Only the API calls out.** The browser calls `GET /api/books/search` and `GET /api/books/search/covers/:id` on Shelfie; the API calls Open Library, its cover host and, when configured, the Claude API. The only data that leaves the server is the typed title. Keys, limits, timeouts and the cover checks live in one place, and the browser's content-security policy stays `connect-src 'self'`.
3. **The AI is a fallback and is labelled.** Claude (`claude-opus-5-5`, called with plain `fetch`, key in `ANTHROPIC_API_KEY`) is asked only when the catalogue returns nothing or fails, for at most three likely matches with author and chapter count. Each such match is marked `suggested: true`, shown with a "Suggested" badge under a note that calls them guesses, and never carries a cover. Without the key the feature runs on the catalogue alone.
4. **A chapter count is filled in only when a source states one.** Open Library's search results state none, so catalogue matches leave the Chapters field to the reader and the page moves focus there. Open Library's page count is not divided into chapters: picture books, chapter books and novels differ too much for any ratio to be a fact. Suggested matches carry the AI's chapter count, under the same badge.
5. **The cover travels through a proxy route and the existing picture path.** The API fetches `https://covers.openlibrary.org/b/id/<id>-L.jpg` with a fixed host, a 5 second timeout and a 5 MB cap, runs it through `processCover` (the checks and re-encoding of `L2-048`) and serves the WebP. The page shows that URL in the list and, on a pick, reads it as a `File` and hands it to the cover picker's path, so the book saves its picture through the unchanged `PUT /api/books/:id/cover`.

6. **Other covers of a picked book come from its Open Library work.** `GET /api/books/search/covers?work=<key>` fetches only `https://openlibrary.org/works/<key>.json`, with the same 5 second timeout, session and limit, keeps its `covers` ids (at most 12) and nothing else, and each cover then loads through decision 5 unchanged. No other catalogue is used and nothing is stored.

## Consequences

- One new table-less feature: nothing is cached or stored by the lookup; a book exists only once `POST /api/books` is called as before.
- Two outbound dependencies at run time. Both are optional: the form works by hand when either or both are down, and the field says so quietly.
- Catalogue matches do not fill the chapter count, which is the field the enhancement most wanted filled. The trade is honesty for coverage; a later source of chapter counts (an edition's table of contents, a second AI call on a pick) can be added behind the same `BookMatch` shape without changing the page.
- A fixed host and a digits-only id make the cover fetch safe against server-side request forgery; a cover the catalogue serves as something other than an image is refused by the same code that refuses a renamed upload.
- The AI's output is untrusted text parsed through the same zod schema as the catalogue's, so a malformed or adversarial answer becomes dropped rows, never markup, a URL or a shell argument.
- `rateLimiter` serves one more limit from the `sign_in_attempt` table under its own key prefix; the table's name is narrower than its use, which is accepted over a migration for a ten-minute window of rows.
