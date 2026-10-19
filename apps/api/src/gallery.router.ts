import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import {
  addGalleryReward,
  addRewardPicture,
  featureRewardPicture,
  getGallery,
  pickGoal,
  processRewardPicture,
  readRewardPicture,
  removeGalleryReward,
  removeRewardPicture,
  updateGalleryReward,
} from './gallery.service.ts';
import { readImage } from './photos.router.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const galleryRewardSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
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

  // Either role may pick; the goal belongs to the household (ADR-0009).
  router.post('/:id/pick', async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => res.json(await pickGoal(db, householdId, String(req.params['id']))));
  });

  // One picture per request, as the raw body; the content decides what it is (ADR-0011, L2-100).
  router.post('/:id/pictures', requireRole('parent'), readImage, async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new Problem(400, 'photo-type');
      const image = await processRewardPicture(req.body);
      res.status(201).json(await addRewardPicture(db, householdId, String(req.params['id']), image));
    });
  });

  router.delete('/:id/pictures/:pictureId', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => res.json(await removeRewardPicture(db, householdId, String(req.params['id']), String(req.params['pictureId']))));
  });

  router.post('/:id/pictures/:pictureId/feature', requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    await answer(res, async () => res.json(await featureRewardPicture(db, householdId, String(req.params['id']), String(req.params['pictureId']))));
  });

  router.get('/:id/pictures/:pictureId', async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const picture = await readRewardPicture(db, householdId, String(req.params['id']), String(req.params['pictureId']));
    if (!picture) return res.status(404).json({ type: 'not-found' });
    const etag = `"${picture.etag}"`;
    // Served as an image only: never sniffed, never run as a page, kept out of shared caches.
    res.set({
      ETag: etag,
      'Cache-Control': 'private, no-cache',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (req.get('if-none-match') === etag) return res.status(304).end();
    res.type('image/webp').send(picture.image);
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
