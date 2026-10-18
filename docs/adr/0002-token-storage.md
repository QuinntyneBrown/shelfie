# ADR-0002: Token storage

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-049, L2-055

## Context

Secrets shall never be printed or stored in plain text (L1-017). The token exists in three places: the server that checks it, the operator's machine that sends it, and the one moment it is created.

## Decision

- **Server.** The `admin_token` table stores the SHA-256 hash of the token, never the token. A 256-bit random token does not need a slow hash: SHA-256 makes the lookup a single indexed equality and an offline guess is still infeasible. The same approach already protects reset and invite tokens (L2-027).
- **Operator's machine.** `shelfie-admin login` reads the token at a hidden prompt (or from redirected standard input) and saves it in the OS credential store, keyed by the target base URL:
  - Windows: Credential Manager, through `CredWriteW` / `CredReadW` / `CredDeleteW`, target name `shelfie-admin:<base URL>`.
  - macOS: the login Keychain, through `security -i`, so the token travels on standard input and never on a command line.
  - Linux: the Secret Service, through `secret-tool`, which also takes the secret on standard input; attributes `service=shelfie-admin`, `url=<base URL>`.
- **Creation.** The server script prints the value once, to the operator's SSH terminal. Nothing else ever prints it.
- The CLI has no token environment variable and no configuration file, so there is no plain-text copy to leak.

## Consequences

- Production and local tokens never mix: each base URL has its own entry.
- A Linux machine without a Secret Service (for example a bare server) cannot store a token; the CLI says so and stops. The CLI acceptance tests run under `dbus-run-session` with an unlocked `gnome-keyring` (`apps/admin-cli/test.sh`).
- The Windows and macOS stores are exercised only by the operator's machine; CI runs the Linux store.
