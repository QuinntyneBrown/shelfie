# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The app and its API move to `https://app.shelfie.kids`; `shelfie.kids` redirects its home page to www and every other path to the app. Everyone signs in once more. `shelfie-admin` defaults to `https://app.shelfie.kids`.

### Fixed

- Badges on the shelf and Review show as tiles of one height, as in the mocks, instead of a bulleted list.

### Added

- Each reader has her own records: a book belongs to one reader, and her chapters, feedback, streak, badges, trophies, certificates and streak rewards are hers alone. Parents pick a reader on Review, Books and Add a book (shown only with two or more readers, remembered on the device); Manage book and Review a chapter name the book's reader. Existing books go to each household's first reader by name; a one-reader household is unchanged. Requirements L1-029, L2-137 to L2-144, design `settings/per-reader-records`, ADR-0018 and ADR-0019, migration `011-per-reader-records.sql`.
- Communities: a fourth parent tab, Community, to start a community, share its 8-character join code, join one with a code (10 tries per 10 minutes), see its families and leave. Other families see only a household's chosen display name and book count. Requirements L1-030, L2-145 to L2-153, design `community/manage-communities`, ADR-0020, migration `012-communities.sql`, components `sh-join-code`, new library `community`.
- Reading goals: a target number of finished books by an end date for the household, and for a community (set by the family that manages it). Readers see progress, reached and ended on their shelf under Reading goals; the reward gallery's goal is unchanged. Requirements L1-031, L2-154 to L2-162, design `community/reading-goals`, ADR-0021, migration `013-reading-goals.sql`, component `sh-goal-card`.

- Feedback notifications: a parent hears on their device when a chapter is waiting for feedback, and a reader hears when a sticker, a book reward or a streak reward arrives. In Settings a parent turns notifications on for this device and chooses, for the household, which of the four events send one (all start on); a reader is offered them once on her shelf. A message is one short line that opens the page it is about and never carries answers, notes or reward text. It is sent through the browser's push service with VAPID keys, is off when `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are unset, and uses a small push-only service worker. Requirements L1-027 and L2-121 to L2-128, design `shell/push-notifications`, ADR-0016, migration `010-push.sql`, component `sh-switch`.
- Send feedback: readers and parents score Shelfie with five faces, say whether it is about how it feels or an idea, and write a message, from the account menu. The operator lists it with `shelfie-admin feedback list` (L2-114 to L2-119, ADR-0014).
- A marketing page at `https://www.shelfie.kids` that explains the reading loop, with real screenshots and links to sign up and sign in; it carries no project links (L2-129 to L2-136, ADR-0017).
- A streak reward can carry an amount in dollars, and the shelf shows each streak reward as a badge, a shield with its milestone and a coin with its amount, with the 7-day goal as a path of days (L2-112, L2-113).

- Shelfie's own reward pictures: beside "Add a picture" in the Add / edit a reward dialog, "Choose one of ours" offers ten built-in pictures (Gift box, Cash, Gift card, Make-up, Jewellery, Theme park, Shopping, Swimming pool, Park, Party). The chosen one is uploaded as an ordinary reward picture, so the API is unchanged. Requirement L2-111.
- Streak rewards: in Settings → Streak rewards a parent sets a reward for 7, 30 and 100 days of reading in a row. When the streak reaches a milestone the reward is earned and stays earned even if the streak later breaks; the reader sees her progress to the next one and a celebration on her shelf, and the parent sees a card on Review and gives it with one tap. Each milestone is earned and given once.
- Achievement badges: the reader's shelf has a Badges section and Review a "Nia’s badges" card with four badges: First book, Double chapter (two chapters in one day), Weekend reader (a Saturday and the Sunday after) and Week streak (seven days in a row). Each shows the day it was earned, or what to do to earn it. They are worked out from the chapter logs on every read, so nothing is stored and no one can edit them.
- Voice answers: on Log a chapter each answer has a "Speak your answer" button, shown where the browser supports speech recognition. The words she speaks are added to the answer as she speaks, she can edit them, and they are sent only when she logs the chapter. Shelfie handles no audio, the API is unchanged, and a refused microphone shows a message and leaves typing as before.
- Reward descriptions and pictures: in the Add / edit a reward dialog a parent can give a gallery reward a description (up to 500 characters after trimming) and up to 6 pictures, make any picture the featured one and remove pictures; removing the featured one features the oldest left. The featured picture replaces the 🎁 on the Settings row and on the reader's "Reading toward" card, which also shows the description; the 🎁 comes back when there is no picture or it fails to load. Pictures upload one at a time (when adding, after the reward is saved), go through the cover pipeline (JPEG, PNG or WebP by content, 5 MB, 40 MP, re-encoded to a 480 × 480 WebP without metadata), are parent-only to change, household-isolated and erased with the reward or household. Requirements L2-108 to L2-110, ADR-0013, migration `007-reward-pictures.sql`, components `sh-sticker` and `sh-picture-list`.
- Reward gallery: in Settings → Rewards a parent keeps a gallery of rewards, each a name of 1 to 100 characters and the number of finished books (1 to 20) that earns it. Under "Reading toward" on her shelf the reader picks one as her goal and sees a progress bar of the books she has finished since she picked it; picking another starts again at 0. When she reaches it she gets a celebration, Review names the finished book that reached it, and its Give a reward opens the usual dialog with the goal's name typed in; once that book has its reward the goal is complete (L2-081 to L2-089, ADR-0009). New migration `005-reward-gallery.sql` and routes under `/api/gallery-rewards`.
- Cover photo picker: after picking a book from the title lookup, a More covers button on Add a book opens a Pick a cover dialog with the other covers Open Library holds for that book. Choosing one and pressing Use this cover makes it the picture, saved with the book like any other; Cancel or Escape leaves the picture as it was, and a book with no other covers or a failed lookup says so without blocking the form. The API lists a work's cover ids (`GET /api/books/search/covers?work=`, at most 12, same session and limit as the search) and each tile loads through the existing cover proxy. Requirements L1-022 and L2-090 to L2-092, design `books/autocomplete-book`, ADR-0008 decision 6, component `sh-cover-gallery`.
- Suggested questions: on Manage a book a parent can press Suggest questions to get up to five ideas for the next chapter from Claude (`claude-opus-5-5`, called by the API with `ANTHROPIC_API_KEY`), tick and reword the ones to keep, and add them as ordinary questions. Only the title, author, chapter number and existing questions are sent; nothing is stored until the parent adds it. Without a key, or when the AI fails, times out or has been asked 5 times in 10 minutes by the household, the dialog says so and Add a question keeps working. Requirements L1-019 and L2-069 to L2-073, design `books/suggest-questions` and ADR-0007.
- AI review assistant: on a pending chapter a parent can press Help me review. The API sends only that chapter's book title, number, questions and answers to Claude (`claude-opus-5-5`, `ANTHROPIC_API_KEY` on the server) and returns, for the parent's eyes only, "Talk about this" flags with a short reason beside weak answers and a suggested note to drop into the note field with Use draft. The parent still picks the sticker and sends; nothing is stored or shown to the reader. Without a key the page says the assistant isn't set up; failures offer Try again; requests are limited to 5 per parent in 10 minutes. Requirements L1-018 and L2-064 to L2-068, design `review/ai-review-assistant` with ADR-001.
- Book autocomplete: on Add a book, typing three letters of a title drops up to five matching books under the Title, from the Open Library catalogue through the API; picking one sets the title, fills the author and gives the form the catalogue cover, fetched and re-encoded by the API like an uploaded picture, while the chapter count stays hers to fill because the catalogue has none. When the catalogue has nothing and `ANTHROPIC_API_KEY` is set, up to three guesses from Claude show with a "Suggested" badge and a note. The list follows the combobox pattern (arrows, Enter, Escape, Tab, announcements); when nothing can answer, a quiet note says so and the form works by hand. Only the typed title leaves the server; the browser never calls a third party; lookups are rate-limited. Requirements L1-020 and L2-074 to L2-080, design `books/autocomplete-book` with ADR-0008, new `sh-combobox` component.
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
- The Appearance heading on Settings, and the card headings on Log a chapter, no longer sit on the card border on iPhone; a card legend now stays inside the card in every browser engine.

### Removed

- PIN sign-in, the profile picker and the remembered-device cookie; an existing database is migrated on start-up, with usernames derived from the parent's e-mail and the reader's name.

### Fixed

- PIN keypad keys are now equal round circles; a long "Not <name>?" label no longer stretches the first column.
- README logo is a vector SVG instead of a 64px PNG scaled up, so it no longer looks fuzzy.

[Unreleased]: https://github.com/QuinntyneBrown/shelfie/commits/main
