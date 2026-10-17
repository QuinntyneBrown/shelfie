# Shelfie

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Frontend: Angular](https://img.shields.io/badge/Frontend-Angular-dd0031.svg)](https://angular.dev)
[![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js-339933.svg)](https://nodejs.org)
[![Tests: Playwright](https://img.shields.io/badge/Tests-Playwright-2ead33.svg)](https://playwright.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Shelfie is a full-stack, responsive web app that helps a young reader build a reading habit. She reads a chapter, logs it, answers a few comprehension questions, and a parent reviews her progress and rewards her when she finishes a book.

It is designed to be extremely easy to navigate and a delight to use. It should feel like fun, not homework.

## Table of contents

- [How it works](#how-it-works)
- [Features](#features)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running locally](#running-locally)
  - [Running the tests](#running-the-tests)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## How it works

1. **Read.** She reads a chapter of a book.
2. **Log.** She logs the chapter in the app.
3. **Answer.** She answers reading comprehension questions about it.
4. **Review.** A parent reviews her progress and answers.
5. **Reward.** She earns a reward when she finishes a book.

## Features

- **Reader experience.** A bookshelf of current and finished books, a one-tap chapter log, and a short set of comprehension questions after each chapter.
- **Parent experience.** A progress view that shows what was read, when, and how the questions were answered.
- **Rewards.** A reward is unlocked when a book is finished.
- **Responsive.** Works on phones, tablets and desktops.
- **Modern web only.** Built for the latest Chrome. It uses current browser features freely and ships no polyfills or legacy fallbacks.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (current LTS or newer) and npm
- [Google Chrome](https://www.google.com/chrome/) (latest stable or newer)
- [Git](https://git-scm.com)

### Installation

```bash
git clone https://github.com/QuinntyneBrown/shelfie.git
cd shelfie
npm install
```

### Running locally

Start the backend API and the Angular dev server:

```bash
npm run dev
```

Then open the URL printed in the terminal in Chrome.

### Running the tests

Frontend acceptance tests are written with Playwright and run in Chromium only.

```bash
npm test
```

### Deployment

Every merge to `main` deploys to `https://shelfie.kids` through GitHub Actions. The production shape, first-time set-up, rollback and restore steps are in [docs/runbook.md](docs/runbook.md).

## Project structure

```text
shelfie/
├── apps/
│   ├── web/          # Angular frontend
│   └── api/          # Node.js backend
├── infra/            # Azure infrastructure and host files
├── docs/
│   ├── specs/            # L1 and L2 requirements with acceptance criteria
│   ├── mocks/            # Static HTML mocks for every screen and state
│   ├── design-system/    # Design tokens and component documentation
│   ├── detailed-designs/ # Software design documents and diagrams
│   └── estimates/        # Effort estimates, percent complete and roadmap
├── AGENTS.md         # Working agreement for human and AI contributors
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── SUPPORT.md
├── CHANGELOG.md
└── LICENSE
```

## Development workflow

Shelfie is built documentation first and test first.

1. **Requirements** are written in `docs/specs/` before any code.
2. **Mocks** for every page, dialog and state are written in `docs/mocks/` before any frontend code.
3. **Design system** tokens and components are extracted from the mocks into `docs/design-system/`.
4. **Detailed designs** and **estimates** are produced for each feature. The overall estimate must stay within the 45-day build budget.
5. **Implementation** proceeds in small slices using acceptance test-driven development. Each slice starts with a failing Playwright test, then the production code that makes it pass.

See [AGENTS.md](AGENTS.md) for the full working agreement, including the build budget and scope rules.

## Documentation

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Goals, tech stack, build budget and engineering rules |
| `docs/specs/` | Requirements and acceptance criteria |
| `docs/mocks/` | HTML mocks for every screen and state |
| `docs/design-system/` | Design tokens and component library |
| `docs/detailed-designs/` | Architecture and feature designs |
| `docs/estimates/` | Effort, progress and roadmap |
| [docs/runbook.md](docs/runbook.md) | Running Shelfie in production |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes per release |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the process, the coding and testing rules, and how to submit a pull request.

## Code of conduct

This project has adopted the [Contributor Covenant](https://www.contributor-covenant.org) code of conduct. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Security

To report a security issue, please follow the process in [SECURITY.md](SECURITY.md). Do not open a public issue.

## Support

See [SUPPORT.md](SUPPORT.md) for how to ask questions and file issues.

## License

Copyright (c) 2026 Quinntyne Brown.

Licensed under the [MIT License](LICENSE).
