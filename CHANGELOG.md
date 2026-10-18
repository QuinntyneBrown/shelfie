# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Accounts and profiles: everyone signs in with a username and password on one page, with a Keep me signed in switch that decides whether the session outlives the browser; a parent signs up to start a household, invites another parent by a single-use 7-day e-mail link, and adds and edits readers (name, colour, username, password) from Settings.
- GitHub Actions CI (typecheck, API tests, build, Playwright e2e) and a deploy workflow that ships every push to `main` to Azure.
- Production infrastructure in `infra/`: Bicep for one Ubuntu VM with Caddy and SQLite on local disk, cloud-init, host scripts and a one-time bootstrap.
- Nightly database backup job with integrity check, 30-day pruning and an off-host copy to Blob Storage.
- Operations runbook in `docs/runbook.md`.
- Project README, license and community health files.
- Working agreement for contributors in `AGENTS.md`.
- Agent skills for requirements, mocks, design system, detailed designs and estimates.
- Shelfie favicon: three pastel books on a shelf on the violet brand tile, replacing the Angular default.

### Removed

- PIN sign-in, the profile picker and the remembered-device cookie; an existing database is migrated on start-up, with usernames derived from the parent's e-mail and the reader's name.

### Fixed

- PIN keypad keys are now equal round circles; a long "Not <name>?" label no longer stretches the first column.
- README logo is a vector SVG instead of a 64px PNG scaled up, so it no longer looks fuzzy.

[Unreleased]: https://github.com/QuinntyneBrown/shelfie/commits/main
