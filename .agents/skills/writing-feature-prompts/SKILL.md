---
name: writing-feature-prompts
description: Write a ready-to-run implementation prompt for a feature request or a bug fix in this repository, save it outside the repo and open it in Notepad. A feature prompt runs mocks, design system, requirements, detailed design, estimate update and incremental ATDD implementation end to end, without stopping. A bug-fix prompt runs reproduce, root cause, fix and doc alignment. Use whenever the user asks to "create a prompt", "write a prompt for this feature" or "for this bug", wants a "prompt to build X" or "prompt to fix Y", or says "open it in notepad".
---

# Writing feature prompts

Turn a feature request or a bug report into one prompt that another agent can run from start to finish. The
prompt directs the work. Do not design the solution here.

## Steps

1. **Gather context (read-only, quick).** Read `AGENTS.md`, then grep for what the request touches: screens,
   `sh-*` components, `apps/api/src` files, the existing L2 requirements in `docs/specs/L2.md` (and the next
   free L2 number), mocks in `docs/mocks/`, and the matching `docs/detailed-designs/{subsystem}/` folder. Name
   real paths in the prompt, for example "the `D` comes from `initial()` in
   `apps/web/projects/components/src/lib/top-bar/top-bar.html`".
2. **Choose the template:** Feature or Bug fix (below).
3. **Write the prompt** to `<scratchpad>/<kebab-slug>-prompt.md`. Use the session's scratchpad directory if it
   has one, otherwise the OS temp directory. Never write it into the repository.
4. **Open it in Notepad:** run `Start-Process notepad "<path>"` in PowerShell, or `notepad.exe "<path>" &` in
   Bash.
5. **Reply** with the prompt's full absolute path and a brief summary of what it covers.

## Writing rules

- Fill in real paths, component names and L2 numbers. Leave no `<placeholders>` in the finished prompt.
- Keep to what the user asked for. Put anything nearby under "deferred", not into the scope.
- List states and slices as suggestions the implementer can adjust.
- Write in plain, short sentences.

## Shared sections (use in both templates, verbatim apart from the noun)

```markdown
## Finish the whole <feature|fix> in one run. Do not stop. (CRITICAL)

- You are authorised to take this <feature|fix> all the way: <the phases>, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where `AGENTS.md` says "stop and ask", treat this prompt as the confirmation in advance for everything in
  scope here. Choose the simplest option that fits the existing architecture, record it (an ADR or the
  detailed design's open-questions section), and keep going.
- If the components library lacks something, that is not a reason to stop. Update the design and the library
  first, as the rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md` / `CLAUDE.md` exactly, especially:
  - **Scope lock and zero-waste engineering.** Build only what is described here. If something seems to need
    more scope, leave it out, note it as deferred, and continue. Do not stop.
  - **The components library is mandatory.** Build all UI from `sh-*` components; follow
    `docs/screen-composition.md`.
  - **ATDD in small slices** with Playwright page objects (`e2e/pages/`), Chromium only, and no architecture
    tests.
  - No single-file components: each component gets `.ts`, `.html` and `.css`.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.
```

## Feature template

```markdown
# Feature: <title>

## Goal

<What the user sees and can do, who can do it (parent, reader), where it appears today (real files), and what
stays unchanged.>

<Shared sections>

## Phase 1: Mocks (`writing-html-mocks`)
- Update or add mocks in `docs/mocks/` for every state, light and dark, at phone, tablet and desktop widths.
  <List the screens and states: default, empty, busy, success, invalid, failed...>
- Update `docs/mocks/manifest.json`, `index.html` and the coverage matrix.

## Phase 2: Design system (`extracting-design-systems`)
- Update `docs/design-system/components/<x>.html` <with what>. Update tokens only if this needs new values.
- Update `docs/screen-composition.md` (`writing-screen-composition`) for every screen that changed.

## Phase 3: Requirements (`engineering-requirements`)
- Add an L1 entry to `docs/specs/L1.md` if needed, and new L2 requirements in `docs/specs/L2.md` (next free
  number after L2-<nnn>) with Given/When/Then acceptance criteria covering: <the behaviours, the validation,
  and the security and privacy concerns>.
- Cross-reference the requirements that already exist (<L2-xxx...>) instead of copying them.

## Phase 4: Detailed design (`writing-software-design-documents`)
- Add `docs/detailed-designs/<subsystem>/<feature>/` with a README and diagrams in the house style. Cover the
  API, migrations, the frontend libraries and <the key decisions>. Record real decisions in an ADR
  (`recording-architecture-decisions`).
- Update the existing designs this touches (<list>) only where needed.

## Phase 5: Estimate update (`estimating-designs`)
- Add the design to `docs/estimates/` (the subsystem table and the root README total, percent complete and
  roadmap) at 0%, and update it again when the work is done.

## Phase 6: Incremental implementation (`implementing-incrementally`, ATDD)
- Plan thin vertical slices, for example:
  1. <slice>
  2. <slice>
- For each slice:
  - Write the Given-When-Then criteria.
  - Write the acceptance test (`e2e/tests/` with a `Traces to: L2-xxx` header, and the page objects in
    `e2e/pages/`, or API tests in `apps/api/src`).
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks, then commit.
- Use Node 24 locally.
- When all slices are green, update the estimate to its true percent complete and keep the mocks, design
  system, screen composition and designs aligned with what was built.

## Done means
- <The behaviour, stated end to end.>
- All the new and existing API, unit and Playwright (Chromium) tests pass.
- The docs (mocks, design system, screen composition, L1/L2, detailed design, ADR, estimates) agree with the
  code.
- The work is on a branch with a PR to `main`, and the checks are green. Fetch and rebase onto `main` first,
  because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
```

## Bug-fix template

```markdown
# Bug fix: <title>

## Bug

<What happens, what should happen, how to reproduce it, and where it lives (real files). The requirement it
breaks: L2-<nnn>.>

<Shared sections>

## Phase 1: Reproduce
- Write a failing test that shows the bug: a Playwright acceptance test (with a `Traces to: L2-<nnn>` header and
  page objects) for visible behaviour, or an API test in `apps/api/src`. Run it and show that it fails for the
  bug's reason.

## Phase 2: Root cause
- Find and state the cause, not the symptom. Check for the same cause elsewhere.

## Phase 3: Fix
- Make the smallest change that turns the test green. Refactor while it is green, run the regression checks,
  then commit.

## Phase 4: Align the docs (only if the behaviour or the spec was wrong or silent)
- Update the L2 criteria, the detailed design, the mocks or `docs/screen-composition.md` to match.
- Update `docs/estimates/` only if a design's percent complete changes.

## Done means
- The bug is gone, and the new test proves it.
- All the existing API, unit and Playwright (Chromium) tests pass.
- The work is on a branch with a PR to `main`, and the checks are green. Fetch and rebase onto `main` first.
- Only then end the run, with a short summary of the cause, the fix and anything deferred.
```
