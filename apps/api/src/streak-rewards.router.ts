import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { clearStreakReward, giveStreakReward, MILESTONES, setStreakReward, streakRewardsOf } from './streak-rewards.service.ts';
import { validationProblem } from './validation.ts';

const streakRewardSchema = z.object({ name: z.string().trim().min(1).max(100) });

/** The household's streak rewards: both roles read them, only parents change or give them (L2-104). */
export function streakRewardsRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/', async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json({ rewards: await streakRewardsOf(db, householdId) });
  });

  router.put('/:milestone', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = streakRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, async () => res.json(await setStreakReward(db, householdId, milestoneOf(req.params['milestone']), body.data.name)));
  });

  router.delete('/:milestone', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => {
      await clearStreakReward(db, householdId, milestoneOf(req.params['milestone']));
      res.status(204).end();
    });
  });

  router.post('/:milestone/give', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => res.json(await giveStreakReward(db, householdId, milestoneOf(req.params['milestone']))));
  });

  return router;
}

function milestoneOf(param: string | string[] | undefined) {
  const milestone = Number(param);
  if (typeof param !== 'string' || String(milestone) !== param || !MILESTONES.includes(milestone)) throw new Problem(404, 'not-found');
  return milestone;
}

async function answer(res: Response, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}
