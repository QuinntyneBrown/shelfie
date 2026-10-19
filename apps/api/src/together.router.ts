import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { KINDS, logSession, partnersOf, sessionsOf, today } from './together.service.ts';
import { validationProblem } from './validation.ts';

const sessionSchema = z.object({
  partnerId: z.string().min(1),
  kind: z.enum(KINDS),
  minutes: z.number().int().min(5).max(180),
  readOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Reading together: readers log sessions with each other; everyone reads their own (L2-137 to L2-146). */
export function togetherRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/', async (_req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    res.json({
      today: await today(db, householdId),
      partners: await partnersOf(db, householdId, profileId),
      sessions: await sessionsOf(db, householdId, profileId),
    });
  });

  router.post('/sessions', async (req, res) => {
    const { householdId, profileId, role } = res.locals['session'] as RequestSession;
    if (role !== 'reader') return res.status(403).json({ type: 'readers-only' });
    const body = sessionSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, async () => res.status(201).json(await logSession(db, householdId, profileId, body.data)));
  });

  return router;
}

async function answer(res: Response, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}
