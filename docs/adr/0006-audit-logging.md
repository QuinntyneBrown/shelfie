# ADR-0006: Admin audit logging

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-052

## Context

Every admin call shall be audit logged on the server (L1-017). The API already writes one JSON line per request to journald (L2-032), but journald rotates and its lines carry neither the token nor the target. Log shipping beyond journald is deferred (AGENTS.md).

## Decision

- The admin router's first middleware, `adminAudit`, inserts one row into `admin_audit` when each response finishes: time, token id, method, route pattern, target id, dry-run flag, status and request id.
- The row is written for every outcome, including 401, 403, 404, 429 and 400, so refused attempts are visible too.
- The row never holds the token, a hash, a body, a password, an answer, a note or a reward text. The target id comes from the path, the token id from the matched token.
- The table lives in the same PostgreSQL database, so point-in-time restore and the nightly `pg_dump` keep it. Rows are not pruned.
- The operator reads it on the VM with `psql` (docs/runbook.md); there is no API endpoint for it.

## Consequences

- One small insert per admin call, on the API's connection pool, after the response is sent.
- The audit trail cannot be changed through the admin API itself.
