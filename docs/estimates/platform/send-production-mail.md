# Estimate — Production mail provider (Azure Communication Services)

## Basis

Hours for an intermediate Node/Express developer with Azure Bicep experience. The work is described in the verify-email design ("Mail" and "Infrastructure") and ADR-0019; it has no design folder of its own under `platform/`. The hours exclude the operator's one-time steps (deploying, verifying the domain, adding the Namecheap records), which the runbook lists. [Detailed design](../../detailed-designs/sign-in/verify-email/README.md), [ADR-0019](../../adr/0019-acs-email-from-hello-shelfie-kids.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `mail.ts`: ACS transport with `DefaultAzureCredential`, `sendWithAcs` with an injected client, SMTP fallback, sender defaults; API test with a fake ACS client | 3 |
| `infra/main.bicep`: communication service, e-mail service, `shelfie.kids` domain, `hello` sender, `linkEmailDomain`, VM role assignment, outputs; `az bicep build` | 3 |
| `infra/bootstrap.sh` writes `ACS_EMAIL_ENDPOINT` and `ACS_EMAIL_SENDER`; `docs/runbook.md` DNS records, verify-then-link steps and variables | 2 |
| **Total** | **8** |

## Minimal scope

The ACS transport and the Bicep resources, with the domain linked by hand in the portal. It costs 6 hours.
