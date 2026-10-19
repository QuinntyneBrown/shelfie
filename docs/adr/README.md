# Architecture decision records

Each record states one decision, its context and its consequences (Nygard format). Records are numbered and never renumbered; a changed decision gets a new record that supersedes the old one.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-cli-auth-admin-tokens.md) | The CLI authenticates with scoped, expiring, revocable admin API tokens, not device-code login | Accepted |
| [0002](0002-token-storage.md) | Tokens are kept in the OS credential store on the operator's machine and only as SHA-256 hashes on the server | Accepted |
| [0003](0003-cli-project-location.md) | The CLI lives in `apps/admin-cli` as one .NET 10 tool project and one test project | Accepted |
| [0004](0004-command-framework.md) | Commands are built with System.CommandLine 2.0 | Accepted |
| [0005](0005-admin-api-exposure.md) | The admin API is versioned under `/api/admin/v1`, served through the existing Caddy TLS endpoint, with no IP allow-list | Accepted |
| [0006](0006-audit-logging.md) | Every admin call writes one row to the `admin_audit` table | Accepted |
| [0007](0007-suggest-questions-with-claude.md) | Suggested questions come from Claude (`claude-opus-5-5`) through one `fetch` on the API server; nothing is saved until a parent adds it | Accepted |
| [0008](0008-look-books-up-through-the-api.md) | Book titles are looked up by the API only, in Open Library first and Claude as a labelled fallback; no chapter count is derived from the catalogue; covers come through a proxy route into the existing picture path | Accepted |
| [0009](0009-reward-gallery-goal-and-progress.md) | The reward gallery has one goal per household, counted from the pick, reached at the target-th finished book and completed when that book gets its reward through the unchanged Give a reward flow | Accepted |
| [0010](0010-dictate-answers-with-the-browser.md) | Answers are dictated with the browser's speech recognition; Shelfie records, receives and stores no audio and the API does not change | Accepted |
| [0011](0011-badges-are-derived-from-the-logs.md) | Achievement badges are derived from chapter logs and finished books on every read; nothing stores them and there is no endpoint that writes one |
| [0012](0012-streak-rewards-are-earned-when-read.md) | Streak rewards live in their own table, are earned (and stored) the first time a read sees the streak at the milestone, and are given once with one call |
| [0013](0013-reward-pictures-upload-apart-and-one-featured.md) | Reward pictures upload one request at a time, apart from saving the reward (sent after it when adding), through the existing image pipeline; the featured mark is a flag on the picture row, at most one per reward by a partial unique index, changed under a lock on the reward row | Accepted |
| [0014](0014-feedback-is-read-only-by-the-operator.md) | Feedback lives in a `feedback` table per household, written only by `POST /api/feedback` from the session's household and read only by the operator through the admin API and `shelfie-admin feedback list` | Accepted |
| [0015](0015-certificates-are-pdfs-drawn-on-the-server.md) | Finish certificates are one-page PDFs drawn on the server with pdfkit, fetched by a plain link with the same access as the book, as an uncached attachment | Accepted |
| [0016](0016-push-with-a-push-only-service-worker.md) | Push uses a hand-written push-only `sw.js`, the `web-push` package and best-effort in-process sending; the chapter notification waits out the undo window; push is off when the VAPID keys are unset | Accepted |
| [0017](0017-marketing-site-and-app-host.md) | A static marketing page at www.shelfie.kids, served by the same Caddy from `apps/marketing/` outside the Angular workspace; the app and API move to app.shelfie.kids and the bare domain redirects | Accepted |
| [0019](0019-authors-and-volunteers-are-profiles-without-a-household.md) | Authors and volunteers are new `profile` roles with no household, sharing sign-in, sessions and reset; household routes answer them 403 `household-only` through `requireSession`, and their own routes use `requireDirectorySession` | Accepted |
| [0020](0020-paid-profiles-are-deferred.md) | Joining as an author or volunteer is free; paid author listings (likely Stripe Checkout, a yearly fee) are recorded and deferred | Accepted |
| [0021](0021-the-operator-approves-directory-profiles.md) | A new profile is hidden until the operator approves it with `shelfie-admin profiles approve`; `profiles hide` hides it again; edits after approval stay listed | Accepted |
| [0022](0022-parents-contact-volunteers-outside-shelfie.md) | Volunteers publish a plain-text contact line; Shelfie sends nothing between parents and volunteers and says it does not vet them | Accepted |
| [0023](0023-catalogue-books-are-copied-onto-the-shelf.md) | Add to shelf prefills the existing Add a book page from the catalogue; the household's book is a copy with nothing linking it to the author | Accepted |
| [0024](0024-the-directory-is-a-parent-tab.md) | Directory is a fourth parent tab; authors and volunteers land on My profile, authors with a My catalogue tab and volunteers with no tabs | Accepted |
