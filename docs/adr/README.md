# Architecture decision records

Each record states one decision, its context and its consequences (Nygard format). Records are numbered and never renumbered; a changed decision gets a new record that supersedes the old one.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-cli-auth-admin-tokens.md) | The CLI authenticates with scoped, expiring, revocable admin API tokens, not device-code login | Accepted |
| [0002](0002-token-storage.md) | Tokens are kept in the OS credential store on the operator's machine and only as SHA-256 hashes on the server | Accepted |
| [0003](0003-cli-project-location.md) | The CLI lives in `apps/admin-cli` as one .NET 10 tool project and one test project | Accepted |
| [0004](0004-command-framework.md) | Commands are built with System.CommandLine 2.0 | Accepted |
| [0005](0005-admin-api-exposure.md) | The admin API is versioned under `/api/admin/v1`, served through the existing Caddy TLS endpoint, with no IP allow-list | Accepted |
| [0006](0006-audit-logging.md) | Every admin call writes one row to the `admin_audit` table | Accepted |
| [0007](0007-suggest-questions-with-claude.md) | Suggested questions come from Claude (`claude-opus-5-5`) through one `fetch` on the API server; nothing is saved until a parent adds it | Accepted |
| [0008](0008-look-books-up-through-the-api.md) | Book titles are looked up by the API only, in Open Library first and Claude as a labelled fallback; no chapter count is derived from the catalogue; covers come through a proxy route into the existing picture path | Accepted |
