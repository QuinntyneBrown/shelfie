import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { getCommunity, joinCommunity, leaveCommunity, listCommunities, requireManager, startCommunity } from './communities.service.ts';
import { goalSchema, removeCommunityGoal, setCommunityGoal } from './goals.service.ts';
import { Problem } from './problem.ts';
import { joinLimiter } from './rate-limit.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

// The name every family sees, and the name this household shows in it (L2-145, L2-146).
const name = z.string().trim().min(1).max(40);
const startSchema = z.object({ name, familyName: name });
const joinSchema = z.object({ code: z.string().max(40), familyName: name });
const COMMUNITY_MAX = 1000;

async function answer(res: Response, work: () => Promise<unknown>, status = 200) {
  try {
    const body = await work();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}

/** Communities are for parents only; a household sees only the communities it is in (L2-152, L2-153). */
export function communitiesRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db), requireRole('parent'));
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/', async (_req, res) => {
    res.json({ communities: await listCommunities(db, householdOf(res)) });
  });

  router.post('/', async (req, res) => {
    const body = startSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, () => startCommunity(db, householdOf(res), body.data.name, body.data.familyName), 201);
  });

  router.post('/join', joinLimiter(db), async (req, res) => {
    const body = joinSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, () => joinCommunity(db, householdOf(res), body.data.code, body.data.familyName));
  });

  router.get('/:id', async (req, res) => {
    await answer(res, () => getCommunity(db, String(req.params['id']), householdOf(res)));
  });

  router.delete('/:id/membership', async (req, res) => {
    await answer(res, () => leaveCommunity(db, String(req.params['id']), householdOf(res)));
  });

  router.put('/:id/goal', async (req, res) => {
    const body = goalSchema(COMMUNITY_MAX).safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    const id = String(req.params['id']);
    await answer(res, async () => {
      await requireManager(db, id, householdOf(res));
      await setCommunityGoal(db, id, householdOf(res), body.data);
      return getCommunity(db, id, householdOf(res));
    });
  });

  router.delete('/:id/goal', async (req, res) => {
    const id = String(req.params['id']);
    await answer(res, async () => {
      await requireManager(db, id, householdOf(res));
      await removeCommunityGoal(db, id);
    });
  });

  return router;
}
