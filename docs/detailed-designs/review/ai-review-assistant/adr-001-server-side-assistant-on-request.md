# ADR-001: Run the review assistant on the server, on request, with the chapter's text only

## Status

Accepted, 18 October 2026.

## Context

A parent reviewing a chapter wants help spotting answers that show weak understanding and a starting point for a warm note (`L1-016`). The answers are a child's words. The parent must stay in charge of what she receives, and reviewing must keep working when the help does not.

Choices that needed a decision:

1. **Where the model is called:** from the browser with a key it holds, or from the API server.
2. **When it runs:** automatically when the page opens, or only when the parent asks.
3. **What it is sent:** the whole household context (names, earlier chapters, the book) or the one chapter.
4. **What happens to its output:** stored with the chapter, or kept only on the parent's screen.
5. **What it decides:** whether it may choose the sticker or send.

## Decision

- The API server calls the Anthropic Messages API (`claude-opus-5-5`, structured JSON output, low effort, a 20-second timeout) with plain `fetch`. The key is `ANTHROPIC_API_KEY` on the server. All of it sits behind one provider function, `ReviewAssistant`, so the tests use a fake and no SDK is added.
- It runs only when the parent presses "Help me review" on a pending chapter. Opening the page sends nothing.
- It is sent the book title, the chapter number, and each question with that chapter's answer, as JSON inside a `<chapter>` tag that the prompt calls data, never instructions. No names, usernames, e-mails, household, other chapters or pictures.
- Its output is validated on the server (well-formed entries only, reason ≤ 120, draft cut to 300), returned to the parent's page, and shown as plain text. It is not stored, logged or shown to the reader.
- It never picks the sticker and never sends. The draft enters the note only through "Use draft" when the note is empty.
- The route reuses the parent-write guards (session, `requireRole('parent')`, CSRF) and the sign-in rate limiter, generalised and keyed per parent at 5 requests in 10 minutes.

## Consequences

- The key never reaches a browser, and the one place that knows about Anthropic is easy to replace or remove.
- A child's answers leave Shelfie only when a parent asks, and only that chapter's. The privacy statement is short and testable (`L2-053`).
- Nothing new in the database: no migration, nothing to erase, no history to keep in step. Leaving the page loses the advice; asking again costs another call.
- Untrusted answer text can at worst make the model return odd advice, which the validator bounds in shape and length and the page renders as text. It cannot send, store or pick a sticker.
- Without a key the feature says it is not set up and review works as before, so development and CI need no key.
- The limiter's table, `sign_in_attempt`, now also counts assist requests under `assist:` keys. Its name no longer says everything it holds; renaming it is not worth a migration.
