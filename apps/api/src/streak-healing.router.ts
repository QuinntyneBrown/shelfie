import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { requireSession, type RequestSession } from './session.ts';
import { clearHealingActivity, healingOf, setHealingActivity } from './streak-healing.service.ts';
import { validationProblem } from './validation.ts';

const activitySchema = z.object({ name: z.string().trim().min(1).max(100) });

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

  return router;
}
