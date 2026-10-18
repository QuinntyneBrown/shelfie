import express, { Router } from 'express';
import type { Pool } from 'pg';
import { Problem } from './problem.ts';
import { processPhoto, readPhoto, removePhoto, savePhoto } from './photos.service.ts';
import { requireSession, type RequestSession } from './session.ts';

/** Any declared type is read: the content decides what the upload is, not its name or header. */
const rawPhoto = express.raw({ type: () => true, limit: '5mb' });

export function photosRouter(db: Pool) {
  const router = Router();

  router.put('/profile/photo', requireSession(db), (req, res, next) => {
    rawPhoto(req, res, (error?: unknown) => {
      if ((error as { type?: string } | undefined)?.type === 'entity.too.large') return res.status(413).json({ type: 'photo-too-large' });
      next(error);
    });
  }, async (req, res) => {
    const { profileId } = res.locals['session'] as RequestSession;
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new Problem(400, 'photo-type');
      res.json({ photo: await savePhoto(db, profileId, await processPhoto(req.body)) });
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.delete('/profile/photo', requireSession(db), async (_req, res) => {
    const { profileId } = res.locals['session'] as RequestSession;
    await removePhoto(db, profileId);
    res.status(204).end();
  });

  router.get('/photos/:profileId', requireSession(db), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const photo = await readPhoto(db, householdId, String(req.params['profileId']));
    if (!photo) return res.status(404).json({ type: 'not-found' });
    const etag = `"${photo.etag}"`;
    // Served as an image only: never sniffed, never run as a page, kept out of shared caches.
    res.set({
      ETag: etag,
      'Cache-Control': 'private, no-cache',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (req.get('if-none-match') === etag) return res.status(304).end();
    res.type('image/webp').send(photo.image);
  });

  return router;
}
