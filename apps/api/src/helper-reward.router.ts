import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { giveHelperReward, helperRewardOf, setHelperReward } from './helper-reward.service.ts';
import { Problem } from './problem.ts';
import type { Notifier } from './push.service.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const helperRewardSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetMinutes: z.number().int().min(30).max(600),
});

/** The household's helper reward: both roles read it, only parents set it (L2-141, L2-146). */
export function helperRewardRouter(db: Pool, notifier: Notifier) {
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

  router.post('/give', requireRole('parent'), async (_req, res) => {
    const { householdId, name } = res.locals['session'] as RequestSession;
    try {
      const { reward, earnedBy } = await giveHelperReward(db, householdId);
      await notifier.helperReward(householdId, name, earnedBy.name);
      res.json(reward);
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
