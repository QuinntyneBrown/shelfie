# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Suggested questions: on Manage a book a parent can press Suggest questions to get up to five ideas for the next chapter from Claude (`claude-opus-5-5`, called by the API with `ANTHROPIC_API_KEY`), tick and reword the ones to keep, and add them as ordinary questions. Only the title, author, chapter number and existing questions are sent; nothing is stored until the parent adds it. Without a key, or when the AI fails, times out or has been asked 5 times in 10 minutes by the household, the dialog says so and Add a question keeps working. Requirements L1-018 and L2-064 to L2-068, design `books/suggest-questions` with ADR-001.
- AI review assistant: on a pending chapter a parent can press Help me review. The API sends only that chapter's book title, number, questions and answers to Claude (`claude-opus-5-5`, `ANTHROPIC_API_KEY` on the server) and returns, for the parent's eyes only, "Talk about this" flags with a short reason beside weak answers and a suggested note to drop into the note field with Use draft. The parent still picks the sticker and sends; nothing is stored or shown to the reader. Without a key the page says the assistant isn't set up; failures offer Try again; requests are limited to 5 per parent in 10 minutes. Requirements L1-018 and L2-064 to L2-068, design `review/ai-review-assistant` with ADR-001.
- Book cover pictures: the reader or a parent can add a picture, such as a photo of the real cover, when adding a book, and a parent can change or remove it from the Manage a book header. It shows over the colour and sticker on every cover in the app, which come back if the picture is missing or fails to load. Pictures are JPEG, PNG or WebP up to 5 MB, re-encoded by the API to a 320 × 480 WebP without metadata, stored in PostgreSQL (`book_cover`, migration 003) and served only inside the household. Requirements L2-046 to L2-048, design `books/upload-book-cover` with ADR-001.
- Profile photos: a parent (from Settings) and a reader (from My photo in her account menu) can upload, replace and remove their own photo, which replaces their initial in the top bar and the Settings lists. Uploads are JPEG, PNG or WebP up to 5 MB, re-encoded by the API with `sharp` to a 256 × 256 WebP without EXIF or GPS data, stored in PostgreSQL (`profile_photo`, migration 002) and served only inside the household. Requirements L1-015 and L2-042 to L2-045, design `settings/upload-profile-photo` with ADR-001.
- Accounts and profiles: everyone signs in with a username and password on one page, with a Keep me signed in switch that decides whether the session outlives the browser; a parent signs up to start a household, invites another parent by a single-use 7-day e-mail link, and adds and edits readers (name, colour, username, password) from Settings.
- Household data now lives in PostgreSQL 16 (Azure Database for PostgreSQL Flexible Server in production, private and TLS-only) instead of SQLite on the VM: versioned migrations run at start-up, every table cascades from its household so one `DELETE` erases a family, a nightly job purges expired rows and uploads a `pg_dump` to Blob Storage, and `npm run import-sqlite -w apps/api` carries the first release's data over. Requirements L1-014 and L2-037 to L2-041, design `platform/run-production-database`.
- GitHub Actions CI (typecheck, API tests, build, Playwright e2e) and a deploy workflow that ships every push to `main` to Azure.
- Production infrastructure in `infra/`: Bicep for one Ubuntu VM with Caddy, cloud-init, host scripts and a one-time bootstrap.
- Nightly database dump to Blob Storage, kept for 30 days.
- Operations runbook in `docs/runbook.md`.
- Project README, license and community health files.
- Working agreement for contributors in `AGENTS.md`.
- Agent skills for requirements, mocks, design system, detailed designs and estimates.
- Shelfie favicon: three pastel books on a shelf on the violet brand tile, replacing the Angular default.
- `shelfie-admin`, a .NET global tool in `apps/admin-cli` for the operator to query and correct production data, and its admin API under `/api/admin/v1` with scoped, expiring, revocable tokens, a rate limit and an audit trail (L1-016, L1-017; `docs/adr/`).

### Fixed

- The breadcrumb on the review chapter, chapter and book pages no longer sits flush against the top bar; it now has 16px of space above it.
- Opening Shelfie (or the sign-in page) while still signed in now goes straight to Review or the shelf, instead of showing the sign-in form under the signed-in top bar and photo.
- Sign-in, sign-up and the other pages outside the shell no longer show a vertical scrollbar when everything fits in the window.

### Removed

- PIN sign-in, the profile picker and the remembered-device cookie; an existing database is migrated on start-up, with usernames derived from the parent's e-mail and the reader's name.

### Fixed

- PIN keypad keys are now equal round circles; a long "Not <name>?" label no longer stretches the first column.
- README logo is a vector SVG instead of a 64px PNG scaled up, so it no longer looks fuzzy.

[Unreleased]: https://github.com/QuinntyneBrown/shelfie/commits/main
