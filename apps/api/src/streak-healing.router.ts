import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { clearHealingActivity, healDay, healingOf, setHealingActivity } from './streak-healing.service.ts';
import { validationProblem } from './validation.ts';

const activitySchema = z.object({ name: z.string().trim().min(1).max(100) });
const healSchema = z.object({ day: z.iso.date() });

/** The household's streak healing: both roles read it, only parents change it or heal (L2-164). */
export function streakHealingRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/', async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(await healingOf(db, householdId));
  });

  router.put('/activity', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = activitySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    res.json(await setHealingActivity(db, householdId, body.data.name));
  });

  router.delete('/activity', requireRole('parent'), async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await clearHealingActivity(db, householdId);
    res.status(204).end();
  });

  router.post('/heals', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = healSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, async () => res.status(201).json(await healDay(db, householdId, body.data.day)));
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
