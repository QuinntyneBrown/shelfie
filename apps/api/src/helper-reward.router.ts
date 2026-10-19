import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { helperRewardOf, setHelperReward } from './helper-reward.service.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const helperRewardSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetMinutes: z.number().int().min(30).max(600),
});

/** The household's helper reward: both roles read it, only parents set it (L2-141, L2-146). */
export function helperRewardRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/', async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json({ reward: await helperRewardOf(db, householdId) });
  });

  router.put('/', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = helperRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    res.json(await setHelperReward(db, householdId, body.data.name, body.data.targetMinutes));
  });

  return router;
}
