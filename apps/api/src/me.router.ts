import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { getMyProfile, updateMyProfile } from './me.service.ts';
import { processPhoto, readOwnPhoto, removePhoto, savePhoto } from './photos.service.ts';
import { readImage, sendPicture } from './photos.router.ts';
import { Problem } from './problem.ts';
import { requireDirectorySession, type DirectorySession } from './session.ts';
import { validationProblem } from './validation.ts';

const name = z.string().trim().min(1).max(40);
const bio = z.string().trim().min(1).max(500);
const website = z
  .string()
  .trim()
  .max(200)
  .regex(/^https?:\/\/\S+$/)
  .nullish()
  .or(z.literal('').transform(() => null));
const authorSchema = z.object({ name, bio, website });
const volunteerSchema = z.object({ name, bio, ages: z.string().trim().min(1).max(40), contact: z.string().trim().min(1).max(120) });

/** An author's or volunteer's own profile and photo (`L2-138`, `L2-139`). No route takes a profile id. */
export function meRouter(db: Pool) {
  const router = Router();
  router.use(requireDirectorySession(db));
  const sessionOf = (locals: Record<string, unknown>) => locals['session'] as DirectorySession;

  router.get('/', async (_req, res) => {
    res.json(await getMyProfile(db, sessionOf(res.locals).profileId));
  });

  router.put('/', async (req, res) => {
    const session = sessionOf(res.locals);
    const body = (session.role === 'author' ? authorSchema : volunteerSchema).safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    res.json(await updateMyProfile(db, session, body.data));
  });

  router.put('/photo', readImage, async (req, res) => {
    const { profileId } = sessionOf(res.locals);
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new Problem(400, 'photo-type');
      await savePhoto(db, profileId, await processPhoto(req.body));
      res.json({ photo: (await getMyProfile(db, profileId)).photo });
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.delete('/photo', async (_req, res) => {
    await removePhoto(db, sessionOf(res.locals).profileId);
    res.status(204).end();
  });

  router.get('/photo', async (req, res) => {
    sendPicture(req, res, await readOwnPhoto(db, sessionOf(res.locals).profileId));
  });

  return router;
}
