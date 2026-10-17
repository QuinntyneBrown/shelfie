# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions CI (typecheck, API tests, build, Playwright e2e) and a deploy workflow that ships every push to `main` to Azure.
- Production infrastructure in `infra/`: Bicep for one Ubuntu VM with Caddy and SQLite on local disk, cloud-init, host scripts and a one-time bootstrap.
- Nightly database backup job with integrity check, 30-day pruning and an off-host copy to Blob Storage.
- Operations runbook in `docs/runbook.md`.
- Project README, license and community health files.
- Working agreement for contributors in `AGENTS.md`.
- Agent skills for requirements, mocks, design system, detailed designs and estimates.

[Unreleased]: https://github.com/QuinntyneBrown/shelfie/commits/main
