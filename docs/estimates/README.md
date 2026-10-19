# Estimates

- Overall effort: 108 days
- Complete: 94%

| Subsystem | Effort | Complete |
|---|---|---|
| [sign-in](sign-in.md) | 14 days | 100% |
| [settings](settings.md) | 17 days | 100% |
| [platform](platform.md) | 12 days | 86% |
| [shell](shell.md) | 5 days | 96% |
| [review](review.md) | 17 days | 69% |
| [admin-api](admin-api.md) | 6 days | 100% |
| [admin-cli](admin-cli.md) | 7 days | 100% |
| [books](books.md) | 21 days | 100% |
| [reading-log](reading-log.md) | 9 days | 100% |

## Roadmap

1. platform: Lighthouse CI; the `platform/` folder layout the harden-api design describes; first bootstrap of the PostgreSQL server and rehearsal of import and restore
2. shell, review: service worker, drop-after-3-rejections rule, review queue loading and error states
3. Deferred: uptime monitoring, log shipping beyond journald, production e-mail provider, self-service household deletion and export; for the AI review assistant, stored advice or its history, per-household quotas, model choice in settings and streaming output; for the reward gallery, streak rewards, badges, notifications, reward pictures, ordering, several goals at once and a history of past goals

## Risks and dependencies

- **Production deployment.** The admin API ships with the next merge to `main`; the `admin_token` and `admin_audit` tables arrive as a versioned migration. No Caddy or Bicep change is needed (ADR-0005).
- **Token provisioning.** The first token needs SSH to the VM (`docs/runbook.md`, "Admin CLI"). Until then the CLI cannot reach production.
- **Backups before writes.** Write commands change production directly. The runbook asks for a manual backup before any write session; the nightly backup alone may be up to a day old.
- **Credential stores.** CI exercises only the Linux Secret Service; the Windows and macOS stores are first exercised on the operator's machine.
