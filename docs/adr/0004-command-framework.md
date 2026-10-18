# ADR-0004: Command framework

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-054, L2-062, L2-063

## Context

The CLI has 12 commands in four groups (`login`, `logout`, `whoami`, `users`, `books`, `logs`), global options (`--api-url`, `--json`), write options (`--dry-run`, `--yes`), `--help` and `--version`. Options considered: System.CommandLine 2.0, Spectre.Console.Cli, and hand-written argument parsing.

## Decision

Use System.CommandLine 2.0 (stable, maintained by the .NET team). It gives subcommands, typed options and arguments, recursive global options, help and `--version` with no extra code. Tables are printed by a small `Output` class rather than a rendering library, because the tables are plain aligned columns.

## Consequences

- One package dependency for the tool.
- Parse errors print the error and help and exit with code 1, which matches the "refused or failed" code of L2-063.
