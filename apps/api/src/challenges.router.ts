import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { challengesOf, closeExpired, createChallenge, endChallenge, removeChallenge, rewardChallenge } from './challenges.service.ts';
import { giveRewardSchema } from './review.router.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const challengeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  measure: z.enum(['chapters', 'books']),
  goal: z.number().int().min(1).max(500),
  length: z.enum(['week', 'two-weeks', 'month']),
  readerIds: z
    .array(z.string())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, 'Each reader once'),
});

async function replying(res: Response, run: () => Promise<unknown>, status = 200) {
  try {
    const body = await run();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}

export function challengesRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/', async (_req, res) => {
    await closeExpired(db, householdOf(res));
    await replying(res, () => challengesOf(db, householdOf(res)));
  });

  router.post('/', requireRole('parent'), async (req, res) => {
    const body = challengeSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await closeExpired(db, householdOf(res));
    await replying(res, () => createChallenge(db, householdOf(res), body.data), 201);
  });

  router.post('/:id/end', requireRole('parent'), async (req, res) => {
    await replying(res, () => endChallenge(db, householdOf(res), String(req.params['id'])));
  });

  router.post('/:id/reward', requireRole('parent'), async (req, res) => {
    const body = giveRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await replying(res, () => rewardChallenge(db, householdOf(res), String(req.params['id']), body.data.text, body.data.note), 201);
  });

  router.delete('/:id', requireRole('parent'), async (req, res) => {
    await replying(res, () => removeChallenge(db, householdOf(res), String(req.params['id'])));
  });

  return router;
}
