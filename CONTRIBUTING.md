# Contributing to Shelfie

Thank you for your interest in contributing. This document explains how to propose changes and what is expected of a pull request.

## Table of contents

- [Before you start](#before-you-start)
- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Development setup](#development-setup)
- [Making changes](#making-changes)
- [Testing](#testing)
- [Submitting a pull request](#submitting-a-pull-request)
- [Commit messages](#commit-messages)
- [Code of conduct](#code-of-conduct)
- [License](#license)

## Before you start

Read [AGENTS.md](AGENTS.md). It is the working agreement for this repository and it applies to every contributor, human or AI. The most important rules are:

- **Scope lock.** Implement exactly what the issue asks for. No speculative features, abstractions, or refactors.
- **Documentation first.** Requirements, mocks and designs come before code.
- **Acceptance test-driven development.** Every production change starts with a failing acceptance test.

For anything beyond a small fix, open an issue first so the scope can be agreed before work begins.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- What you did, what you expected, and what happened.
- Steps to reproduce.
- Device, screen size and Chrome version.
- Screenshots or a recording if the problem is visual.

Please check existing issues first to avoid duplicates.

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe the problem the feature solves for the reader or the parent, not only the solution.

## Development setup

```bash
git clone https://github.com/QuinntyneBrown/shelfie.git
cd shelfie
npm install
npm run dev
```

See the [README](README.md#getting-started) for prerequisites, including the local PostgreSQL 16 server the API and the tests use.

## Making changes

1. Fork the repository and create a branch from `main`.
2. Keep the change small and focused on one issue.
3. Follow the existing code style. Do not reformat or refactor code you are not changing.
4. Target the latest Chrome only. Do not add polyfills or legacy-browser fallbacks.
5. Update documentation in `docs/` when behaviour or design changes.
6. Add an entry to [CHANGELOG.md](CHANGELOG.md) under **Unreleased**.

## Testing

Production behaviour is implemented with acceptance test-driven development:

1. Write the Given-When-Then acceptance criteria for the slice.
2. Write the acceptance test and run it. It must fail for the expected reason.
3. Write the smallest production change that makes it pass.
4. Refactor with the tests green and run the relevant regression checks.

Frontend tests use Playwright with the Page Object Model, Chromium only:

- One page object per screen. The page object owns the selectors and the interactions.
- Tests state intent. Never put a selector in a new or changed test.
- Do not configure or run Firefox, WebKit, or any other browser.

Never add tests that assert the shape of the codebase instead of its behaviour. No structure, naming or banned-API tests.

Run the suite before opening a pull request:

```bash
npm test
```

## Submitting a pull request

1. Make sure all tests pass.
2. Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md). Link the issue it resolves.
3. Keep the pull request proportional to the issue. A small fix should be a small diff.
4. Be responsive to review feedback. Maintainers may ask for changes before merging.

Pull requests that add unrequested scope or ship production code without acceptance tests will be asked to be revised.

## Commit messages

- Use the imperative mood in the subject line ("Add chapter log", not "Added chapter log").
- Keep the subject line under 72 characters.
- Reference the issue in the body when applicable (`Fixes #123`).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
