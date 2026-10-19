# ADR-0015: Push uses a push-only service worker, `web-push` and in-process sending

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-120, L2-124, L2-127

## Context

Feedback notifications (`L1-027`) need three things Shelfie does not have: a service worker to show a notification while the app is closed, a way for the API to send a Web Push message, and a place to remember each device's subscription.

The `work-offline` design plans `@angular/service-worker` for asset caching and offline reads. It is not built, and adopting it now would bring caching, update prompts and `ngsw-config.json` into a feature that needs none of them. Shelfie targets bleeding-edge Chrome only (AGENTS.md), so the Push API, `Notification` and service workers are always present and need no fallback.

Sending could use a job queue or an outbox table. Shelfie has neither, runs as one API process on one VM, and sends at most a handful of messages per chapter.

## Decision

1. **A hand-written `sw.js`** in the application's `public` folder, with two handlers only: `push`, which shows the notification, and `notificationclick`, which focuses or opens the page. It caches nothing and does not use `@angular/service-worker`. `work-offline` stays deferred and may adopt Angular's worker later by merging these two handlers into it.
2. **The `web-push` package** signs and sends each message with VAPID keys from `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`. The keys are optional: without them the API reports `push-off` and nothing sends or is offered, as for mail and AI.
3. **A `push_subscription` table** keyed by the browser's endpoint, owned by a profile and removed with it. Household event choices are four boolean columns on `household`, all true by default.
4. **Sending is in process and best effort.** A route calls `notify()` after its own work has succeeded. A failure is logged without the endpoint and never fails the route. A 404 or 410 from the push service deletes the subscription.
5. **The chapter notification waits out the undo window** (`UNDO_SECONDS`) in a timer in the same process, then checks that the log still exists and is not reviewed.

## Consequences

- No new infrastructure beyond one dependency and three optional environment variables; `docs/runbook.md` and `infra/host/Caddyfile` change (a `no-cache` header for `/sw.js`).
- A chapter notification pending when the API restarts is lost. The in-app banner and the review badge still show the waiting chapter, so nothing is missed, only the earlier ping.
- The worker has no offline behaviour, so `work-offline` is neither helped nor hindered.
- The notification is delivered through the browser vendor's push service, which sees the message's size and timing but not its content, because the payload is encrypted to the subscription's keys.
- Push messages carry a title, a body, a tag and a path, never answers, notes or reward text.
