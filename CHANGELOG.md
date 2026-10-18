# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Fixed

- Sign-in, sign-up and the other pages outside the shell no longer show a vertical scrollbar when everything fits in the window.

### Removed

- PIN sign-in, the profile picker and the remembered-device cookie; an existing database is migrated on start-up, with usernames derived from the parent's e-mail and the reader's name.

### Fixed

- PIN keypad keys are now equal round circles; a long "Not <name>?" label no longer stretches the first column.
- README logo is a vector SVG instead of a 64px PNG scaled up, so it no longer looks fuzzy.

[Unreleased]: https://github.com/QuinntyneBrown/shelfie/commits/main
