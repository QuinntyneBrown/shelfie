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
| [0016](0016-marketing-site-and-app-host.md) | A static marketing page at www.shelfie.kids, served by the same Caddy from `apps/marketing/` outside the Angular workspace; the app and API move to app.shelfie.kids and the bare domain redirects | Accepted |
