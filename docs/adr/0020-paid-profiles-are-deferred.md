# ADR-0020: Paid profiles are deferred

- Status: Accepted
- Date: 2026-10-19
- Requirements: L1-030, L1-031

## Context

The request says author profiles might "possibly" be paid. Nothing else about payment is settled: who pays, how much, what a paid profile gets that a free one does not, or how refunds and tax work. Taking money adds a provider, webhooks, receipts and terms of sale, and none of it helps a child read.

## Decision

Joining Shelfie as an author or a volunteer is free. No payment code, provider or table is built.

If paid profiles are wanted later, the likely shape is:

- **Who pays:** authors only. Volunteers stay free, since they give their time.
- **What is charged:** a yearly listing fee for an approved author profile, for example £20 a year, billed after the operator approves the profile and before it is listed. Unpaid profiles stay `approved` but unlisted, as a fourth status.
- **Provider:** Stripe Checkout with a hosted payment page and one webhook (`checkout.session.completed`, `invoice.paid`), so card data never reaches Shelfie; Stripe Tax for VAT.
- **What would change:** a `listing_paid_until` column on `directory_profile`, a webhook route outside the CSRF guard verified by Stripe's signature, a "Pay to list" step on My profile, and the directory filtering on it.

## Consequences

- Listed as deferred in `docs/estimates/README.md`; no hours are counted for it.
- A later paid-profile feature adds to this design without changing sign-up, approval or the directory's other rules.
