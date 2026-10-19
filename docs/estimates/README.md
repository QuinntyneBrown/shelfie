# Estimates

- Overall effort: 128 days
- Complete: 98%

| Subsystem | Effort | Complete |
|---|---|---|
| [sign-in](sign-in.md) | 17 days | 100% |
| [settings](settings.md) | 17 days | 100% |
| [platform](platform.md) | 15 days | 89% |
| [shell](shell.md) | 13 days | 98% |
| [review](review.md) | 22 days | 99% |
| [admin-api](admin-api.md) | 6 days | 100% |
| [admin-cli](admin-cli.md) | 7 days | 100% |
| [books](books.md) | 21 days | 100% |
| [reading-log](reading-log.md) | 10 days | 100% |

## Roadmap

1. platform: Lighthouse CI; the `platform/` folder layout the harden-api design describes; first bootstrap of the PostgreSQL server and rehearsal of import and restore
2. shell, review: service worker, drop-after-3-rejections rule, review queue loading and error states
3. Deferred: uptime monitoring, marketing pricing, privacy, terms and blog pages, analytics and a contact form, log shipping beyond journald, production e-mail provider, self-service household deletion and export; for provider sign-in, linking or unlinking from Settings, other providers, readers and profile pictures; for the AI review assistant, stored advice or its history, per-household quotas, model choice in settings and streaming output; for the reward gallery, streak rewards, badges, ordering, several goals at once and a history of past goals; for reward pictures, reordering, captions, cropping, a full-size viewer, pictures on the trophy shelf, Review or Give a reward, admin CLI support and generated or catalogue pictures; for feedback, a screen to read or reply to it, notifications, attachments, automatic prompts and score charts

## Risks and dependencies

- **DNS and APP_URL before the host move.** `CNAME app` must exist at Namecheap and `/etc/shelfie/env` must say `APP_URL=https://app.shelfie.kids` before the serve-marketing-site release reaches production (`docs/runbook.md`).

- **Production deployment.** The admin API ships with the next merge to `main`; the `admin_token` and `admin_audit` tables arrive as a versioned migration. No Caddy or Bicep change is needed (ADR-0005).
- **Token provisioning.** The first token needs SSH to the VM (`docs/runbook.md`, "Admin CLI"). Until then the CLI cannot reach production.
- **Backups before writes.** Write commands change production directly. The runbook asks for a manual backup before any write session; the nightly backup alone may be up to a day old.
- **Credential stores.** CI exercises only the Linux Secret Service; the Windows and macOS stores are first exercised on the operator's machine.
