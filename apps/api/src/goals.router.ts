import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { requireRole } from './authz.ts';
import { goalSchema, goalsOf, removeHouseholdGoal, setHouseholdGoal } from './goals.service.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const HOUSEHOLD_MAX = 100;

async function answer(res: Response, work: () => Promise<unknown>) {
  try {
    const body = await work();
    if (body === undefined) res.status(204).end();
    else res.json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}

/** Reading goals: readers and parents read them; only parents set or remove the household's (L2-152, L2-158). */
export function goalsRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/', async (_req, res) => {
    res.json(await goalsOf(db, householdOf(res)));
  });

  router.put('/household', requireRole('parent'), async (req, res) => {
    const body = goalSchema(HOUSEHOLD_MAX).safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, () => setHouseholdGoal(db, householdOf(res), body.data));
  });

  router.delete('/household', requireRole('parent'), async (_req, res) => {
    await answer(res, () => removeHouseholdGoal(db, householdOf(res)));
  });

  return router;
}
