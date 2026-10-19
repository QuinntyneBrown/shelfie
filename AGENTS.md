# Shelfie

Shelfie is a full-stack, responsive web app that helps my daughter with her reading.

## How it works

1. She reads a chapter of a book.
2. She logs the chapter in the app.
3. She answers reading comprehension questions about it.
4. I review her progress and answers.
5. I give her a reward when she finishes a book.

## Goals

- **Easy to use:** The UI/UX should be extremely easy to navigate, so she can get through her reading and questions with no friction.
- **A delight to use:** Polish and small touches matter. It should feel fun, not like homework.
- **Responsive:** It should work well on phones, tablets and desktops.

## Tech stack

- **Frontend:** Angular
- **Backend:** Node.js with PostgreSQL 16 (see `docs/detailed-designs/platform/run-production-database`)
- **Target browser:** Bleeding-edge Chrome only. Use the latest browser features freely, including WebGPU. Don't add polyfills or legacy-browser fallbacks.

## Components library is mandatory (CRITICAL)

- The `shelfie` application and its feature libraries MUST be built from the `components` library.
  Never hand-write markup, CSS, icons, overlays or toasts the library already
  provides. Use the `sh-*` component, `sh-dialog`, `ToastService` and `BannerService`.
- `docs/screen-composition.md` is binding. Before implementing any page,
  dialog, notification or shell part, read its entry and use exactly the
  components it lists. Build locally only the UI it marks as local.
- If the library lacks something the entry needs, STOP. Update the detailed design
  and the library first. Do not work around it in the app.
- Keep `docs/screen-composition.md` aligned with the mocks and the detailed designs.

## Scope, Simplicity, and Zero-Waste Engineering (CRITICAL)

This is the absolute highest-priority rule in this repository. AI agents tend to over-engineer, hallucinate future needs, and balloon codebase complexity. This kills project velocity and comprehensibility. You must resist this impulse. Deliver radically simple solutions that fulfill the exact prompt—nothing more.

### 1. Absolute Scope Lock
*   **Deliver Only the Explicit Request:** Implement exactly what is asked for in the immediate task. Do not invent features, add unrequested states, create predictive API endpoints, or spin up new UI screens/components unless explicitly ordered.
*   **Zero Future-Proofing:** Do not write code for "imagined future use cases." Write code strictly for the present moment. If the user didn't ask for it today, it does not exist.
*   **Ignore Unsent Requirements:** Documents, specs, or mocks may contain broader context or future phases. Do not implement them early. Only implement what is requested in the active prompt.

### 2. Radical Simplicity & Proportionality
*   **Proportional Diffs:** The size and footprint of your code change must match the size of the request. A small feature or fix must result in a small, clean, readable diff.
*   **Path of Least Resistance:** Always choose the simplest, most direct code path that solves the problem. Do not introduce new abstractions, architectural layers, design patterns, wrappers, or external libraries unless it is physically impossible to solve the issue without them.
*   **No Unsolicited Refactoring:** Do not "improve," rewrite, or clean up code adjacent to your task unless it is strictly broken and blocking your implementation. Leave surrounding code alone.

### 3. Hard Stop & Query Clause
*   **When in Doubt, Ask:** If a task seems to logically require expanding the scope, introduces a major jump in complexity, or conflicts with the existing architecture, **STOP IMMEDIATELY**. Do not guess. Present the trade-offs to the user and await explicit confirmation before writing a single line of code.

## Incremental Implementation and ATDD - mandatory

Implement production behavior with acceptance test-driven development (ATDD). Plan small, reviewable slices, then complete one slice at a time: write Given-When-Then acceptance criteria, write the acceptance test, and run it to prove it fails for the expected reason BEFORE writing production code. Implement only what satisfies that slice, refactor with tests green, and run the relevant regression checks. Do not move to the next slice until those checks pass. No bulk implementation, no tests added afterward, and no weakening tests to manufacture a pass.

Front end tests use Playwright with the Page Object Model - one page object per screen, owning the selectors and the interactions. Tests state intent; page objects know the DOM. Never put a selector in a new or changed test. Existing specs that still hold selectors are moved into page objects when they are next changed.

Run frontend tests in Chromium only. Do not configure or run Firefox, WebKit, or any other browser for frontend testing.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior: no structure, layout, or naming tests; no banned-API scans; no tests that parse specifications. Those constraints belong to the compiler, the formatter, and review. A test suite exists to prove behavior.

## Folder structure (MANDATORY)

```
shelfie/
├── docs/
│   ├── specs/              # L1.md, L2.md
│   ├── mocks/
│   ├── design-system/
│   ├── detailed-designs/   # {subsystem}/{feature}/
│   ├── adr/                # architecture decision records, NNNN-title.md
│   └── estimates/
├── apps/
│   ├── web/                # Angular workspace
│   │   └── projects/
│   │       ├── components/ # library: ALL reusable UI components (sh-*)
│   │       ├── core/       # library: auth, session, API client, toasts
│   │       ├── <feature>/  # one library per area: sign-in, shelf, books,
│   │       │               #   log-chapter, review, settings
│   │       └── shelfie/    # application: shell, routing, composition only
│   ├── api/                # Node backend (web API and admin API)
│   ├── marketing/          # static marketing page for www.shelfie.kids (see docs/adr/0014)
│   └── admin-cli/          # .NET global tool shelfie-admin (see docs/adr/0003)
│       ├── src/ShelfieAdmin/
│       └── tests/ShelfieAdmin.Tests/   # runs the real tool against a local API
├── e2e/
│   ├── pages/              # Playwright page objects, one per screen
│   └── tests/              # acceptance tests with "Traces to: L2-xxx" header
├── infra/                  # Azure Bicep, cloud-init, host files, bootstrap (see docs/runbook.md)
└── .github/ .agents/ .claude/
```

*   **Components project:** every UI component lives in the `components` library. Feature libraries and the application compose it and do not define reusable components of their own.
*   **Dependencies point one way:** `shelfie` (application) → feature libraries → `components` and `core`. `components` depends on no other project.
*   **The application is thin:** it holds the shell, routes and bootstrapping only. Features live in libraries.
*   **No single-file components (MANDATORY):** every component, in every project, splits its class, markup and styling into separate files in its own folder: `<name>.ts`, `<name>.html` and `<name>.css`. Use `templateUrl` and `styleUrl`; never inline `template` or `styles`. Where a component has more than one concern (for example a view-model, or state kept apart from presentation), give each its own file too. Do not collapse a component into one file to save time.

## Deferred work

Not built yet. Designs mention these as deferred; estimates do not cost them and they do not count toward percent complete. Hosting, TLS, deployment and the nightly backup schedule are built (`infra/`, `docs/runbook.md`).

*   Uptime monitoring and log shipping beyond journald on the VM.
*   The production e-mail provider for password-reset links (Mailpit locally).
*   Self-service household deletion and data export screens; until then the operator runs the erasure statement in `docs/runbook.md`.
