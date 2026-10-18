import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { addGalleryReward, getGallery } from './gallery.service.ts';
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

  return router;
}
