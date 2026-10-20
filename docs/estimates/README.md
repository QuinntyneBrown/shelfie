# Estimates

- Overall effort: 139 days
- Complete: 96%

| Subsystem | Effort | Complete |
|---|---|---|
| [sign-in](sign-in.md) | 24 days | 100% |
| [settings](settings.md) | 17 days | 100% |
| [platform](platform.md) | 16 days | 90% |
| [shell](shell.md) | 13 days | 98% |
| [review](review.md) | 22 days | 99% |
| [admin-api](admin-api.md) | 6 days | 100% |
| [admin-cli](admin-cli.md) | 7 days | 100% |
| [books](books.md) | 21 days | 100% |
| [reading-log](reading-log.md) | 13 days | 77% |

## Roadmap

1. reading-log: heal-streak (streak healing: the activity in Settings, one heal a week from Review, the healed day on the week strip)
2. platform: the operator's one-time mail steps (deploy, verify `shelfie.kids` in ACS, Namecheap records, link; `docs/runbook.md`, "Mail"); Lighthouse CI; the `platform/` folder layout the harden-api design describes; first bootstrap of the PostgreSQL server and rehearsal of import and restore
3. shell, review: service worker, drop-after-3-rejections rule, review queue loading and error states
4. Deferred: for streak healing, more than one activity, a reader-side request, more than one heal a week, push about heals and `shelfie-admin` healing; uptime monitoring, marketing pricing, privacy, terms and blog pages, analytics and a contact form, log shipping beyond journald, re-verifying an e-mail changed in Settings, dark-mode mail, bounce and complaint handling, self-service household deletion and export; for provider sign-in, linking or unlinking from Settings, other providers, readers and profile pictures; for the set-up wizard, more than one child, streak rewards, reward pictures and descriptions, the first book, re-running it from Settings and inviting the other parent; for the AI review assistant, stored advice or its history, per-household quotas, model choice in settings and streaming output; for the reward gallery, streak rewards, badges, ordering, several goals at once and a history of past goals; for reward pictures, reordering, captions, cropping, a full-size viewer, pictures on the trophy shelf, Review or Give a reward, admin CLI support and generated or catalogue pictures; for feedback, a screen to read or reply to it, notifications, attachments, automatic prompts and score charts

## Risks and dependencies

- **Mail needs the operator's DNS steps.** ACS sends from `hello@shelfie.kids` only after the Bicep is deployed, the domain-verification, SPF, DKIM and DMARC records exist at Namecheap, Azure reports the domain verified and a second deployment links it (`docs/runbook.md`, ADR-0019). Until then production sends no mail.
- **DNS and APP_URL before the host move.** `CNAME app` must exist at Namecheap and `/etc/shelfie/env` must say `APP_URL=https://app.shelfie.kids` before the serve-marketing-site release reaches production (`docs/runbook.md`).

- **Production deployment.** The admin API ships with the next merge to `main`; the `admin_token` and `admin_audit` tables arrive as a versioned migration. No Caddy or Bicep change is needed (ADR-0005).
- **Token provisioning.** The first token needs SSH to the VM (`docs/runbook.md`, "Admin CLI"). Until then the CLI cannot reach production.
- **Backups before writes.** Write commands change production directly. The runbook asks for a manual backup before any write session; the nightly backup alone may be up to a day old.
- **Credential stores.** CI exercises only the Linux Secret Service; the Windows and macOS stores are first exercised on the operator's machine.
