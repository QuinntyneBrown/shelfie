# Estimate — Sign in the CLI

## Basis

Hours for an intermediate C#/.NET developer who has not seen this codebase and reads documentation for System.CommandLine 2.0, P/Invoke and the macOS and Linux credential tools. The hours cover the tool project, the xUnit acceptance-test harness that starts the Node API and runs the tool, packaging and review fixes. [Detailed design](../../detailed-designs/admin-cli/sign-in-cli/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Project, `Program` root command, `--api-url`, `--json`, `--version`, packing as `shelfie-admin` | 3 |
| `Target` resolution and the HTTPS rule | 1 |
| `AdminClient`, `ApiResult`, `AdminApiException` | 2 |
| `Cli.RunAsync` failure-to-message and exit-code mapping | 2 |
| `CredentialStore`: Linux `secret-tool`, macOS `security -i`, Windows `CredWriteW`/`CredReadW`/`CredDeleteW` | 6 |
| `Prompt.Secret` with and without a terminal | 1 |
| `login`, `logout`, `whoami` | 2 |
| Test harness: free port, seeded PostgreSQL database, token script, process runner, Secret Service session script | 5 |
| Acceptance tests for sign-in, target, token failures and packaging | 4 |
| CI job | 1 |
| **Total** | **27** |

## Minimal scope

The Linux and Windows credential stores only, `login` and `whoami`, and the default target with `--api-url`. This satisfies `L2-054` criteria 1-3 and 5 and `L2-055` criteria 1-5 and 7 on those systems. It defers macOS, `logout`, `SHELFIE_ADMIN_URL` and the HTTPS rule. Total: 21 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the macOS store | The tool cannot sign in on a Mac | 2 |
| Drop `logout` | The operator deletes the entry in the OS tool | 1 |
| Drop the HTTPS rule | A mistyped `http` URL would send the token in clear text | 1 |
