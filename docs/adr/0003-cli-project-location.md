# ADR-0003: CLI project location and structure

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-054

## Context

The repository already keeps each deployable under `apps/`: `apps/web` (Angular) and `apps/api` (Node). The CLI is a third deployable in another stack (.NET). Its tests run the real tool against a locally running API, so they need both stacks side by side.

## Decision

The CLI lives in `apps/admin-cli`:

```
apps/admin-cli/
├── ShelfieAdmin.slnx
├── test.sh                      # runs the tests inside a Secret Service session
├── src/ShelfieAdmin/            # the tool: PackAsTool, command shelfie-admin
└── tests/ShelfieAdmin.Tests/    # xUnit v3 acceptance tests
```

- One tool project, flat, one file per concern (`Program.cs`, `AdminClient.cs`, `CredentialStore.cs`, the command files). No class library is split out, because nothing else consumes it.
- One test project. Each test starts the Node API from `apps/api` on a free port with its own seeded PostgreSQL database, creates a token with the server script and runs the built tool as a child process.
- The project is not an npm workspace; CI runs it in its own `admin-cli` job.
- AGENTS.md's folder structure names `apps/admin-cli`.

## Consequences

- The CLI and the API it calls change in the same pull request.
- Contributors who do not touch the CLI do not need the .NET SDK; `npm test` stays Node-only.
