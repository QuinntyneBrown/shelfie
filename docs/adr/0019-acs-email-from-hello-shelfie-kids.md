# ADR-0019: Azure Communication Services Email sends Shelfie's mail from hello@shelfie.kids, with the VM's managed identity

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-144, L2-151, L2-153

## Context

Shelfie mails password-reset and invite links, and now a confirm-your-e-mail link at sign-up. The production provider was deferred (AGENTS.md): `SMTP_URL` pointed at Mailpit locally and nothing in production. Shelfie runs on one Azure VM with a system-assigned managed identity (`infra/main.bicep`) in the same subscription as everything else, and its DNS is at Namecheap. Sweet Hand, the operator's other product, already sends from `hello@sweethand.ca` through Azure Communication Services Email with managed identity and Namecheap DNS (sweet-hand ADR-0011, `backend/src/platform/azure-email.ts`), so the setup and the DNS steps are known.

## Decision

1. **Azure Communication Services Email is the production provider.** `infra/main.bicep` declares a `Microsoft.Communication/communicationServices` resource, a `Microsoft.Communication/emailServices` resource with the customer-managed domain `shelfie.kids` (engagement tracking off) and the sender username `hello` with display name "Shelfie".
2. **The VM's managed identity sends.** A role assignment gives the VM's system-assigned identity the Communication and Email Service Owner role on the communication service only, as sweet-hand does; the API uses `EmailClient` from `@azure/communication-email` with `DefaultAzureCredential`. No connection string or key exists anywhere.
3. **Sender `hello@shelfie.kids`.** `ACS_EMAIL_SENDER` holds the address and the ACS sender username carries the display name, so mail arrives as `Shelfie <hello@shelfie.kids>`. Locally `MAIL_FROM` defaults to the same.
4. **The transport is chosen by configuration.** With `ACS_EMAIL_ENDPOINT` set, `mail.ts` sends through ACS; otherwise over `SMTP_URL` (Mailpit); with neither, it logs a warning and sends nothing. The `Mail` function stays injectable, so tests never reach either.
5. **DNS stays at Namecheap.** The operator adds the ACS domain-verification TXT, merges ACS's include into the single SPF record, adds the two DKIM CNAMEs and a `_dmarc` TXT, starts verification, and only then deploys with `linkEmailDomain=true`, because ACS refuses to link an unverified domain. `bootstrap.sh` writes `ACS_EMAIL_ENDPOINT` and `ACS_EMAIL_SENDER` to `/etc/shelfie/env`.

## Consequences

- Mail goes out only after the operator's one-time DNS and verification steps (`docs/runbook.md`); until then the API keeps sending nothing in production, as before.
- The API gains two dependencies (`@azure/communication-email`, `@azure/identity`); they are loaded only when `ACS_EMAIL_ENDPOINT` is set.
- A send waits for ACS to report `Succeeded`, which can take seconds; sign-up therefore does not await its mail, while resend, reset and invite do, as before.
- Bounce and complaint handling, suppression lists and marketing mail are not built.
