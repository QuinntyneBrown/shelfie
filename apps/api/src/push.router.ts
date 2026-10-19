import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { Push } from './push.ts';
import { removeSubscription, saveSubscription } from './push.service.ts';
import { pushLimiter } from './rate-limit.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const base64url = z.string().max(256).regex(/^[A-Za-z0-9_-]+$/);
const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: base64url, auth: base64url }),
});
const endpointSchema = z.object({ endpoint: z.string().max(2048) });

/** The public key and each person's browser subscriptions for push notifications (L2-121, L2-128). */
export function pushRouter(db: Pool, push: Push | null) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/key', (_req, res) => {
    if (!push) return res.status(404).json({ type: 'push-off' });
    res.json({ publicKey: push.publicKey });
  });

  router.post('/subscriptions', pushLimiter(db), async (req, res) => {
    const { profileId } = res.locals['session'] as RequestSession;
    const body = subscriptionSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await saveSubscription(db, profileId, body.data);
    res.status(204).end();
  });

  router.delete('/subscriptions', pushLimiter(db), async (req, res) => {
    const { profileId } = res.locals['session'] as RequestSession;
    const body = endpointSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await removeSubscription(db, profileId, body.data.endpoint);
    res.status(204).end();
  });

  return router;
}
