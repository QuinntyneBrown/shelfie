import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { addGalleryReward, getGallery, removeGalleryReward, updateGalleryReward } from './gallery.service.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const galleryRewardSchema = z.object({
  name: z.string().trim().min(1).max(100),
  target: z.number().int().min(1).max(20),
});

/** The household's reward gallery: both roles read it, only parents change it (L2-084). */
export function galleryRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.get('/', async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(await getGallery(db, householdId));
  });

  router.post('/', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = galleryRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    res.status(201).json(await addGalleryReward(db, householdId, body.data));
  });

  router.patch('/:id', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = galleryRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await answer(res, async () => res.json(await updateGalleryReward(db, householdId, String(req.params['id']), body.data)));
  });

  router.delete('/:id', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => {
      await removeGalleryReward(db, householdId, String(req.params['id']));
      res.status(204).end();
    });
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
