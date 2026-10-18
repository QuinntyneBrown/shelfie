# Estimate — Run admin commands

## Basis

Hours for an intermediate C#/.NET developer, with `sign-in-cli` (client, `Cli`, `Prompt`, test harness) in place. The hours cover the nine commands, `Output`, the shared write flow, acceptance tests against the local API and review fixes. [Detailed design](../../detailed-designs/admin-cli/run-admin-commands/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `Output.Table`, `Output.Fields`, `Output.Json` | 2 |
| Query commands: `users list`, `books list`, `logs list`, `logs show` | 4 |
| `WriteAsync`: preview, `--dry-run`, `Prompt.Confirm`, `--yes`, outcome sentence | 3 |
| Write commands: `users reset-password`, `logs correct`, `logs delete`, `books finish`, `books reward` | 5 |
| Acceptance tests for each command, `--json`, dry run, confirmation and abort | 6 |
| **Total** | **20** |

## Minimal scope

The query commands, `users reset-password` and `logs delete` with confirmation and `--yes`, without `--dry-run`. This satisfies `L2-056` to `L2-059`, `L2-060` criteria 3-5 and `L2-062` criteria 2-3. It defers `logs correct`, `books finish`, `books reward` and `--dry-run`. Total: 13 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `--json` | No machine-readable output; `L2-063` criterion 2 is not met | 1 |
| Drop `books finish` and `books reward` | Rewards are given only in the web app | 3 |
| Drop `logs correct` | Wrong read-on days stay wrong | 2 |
