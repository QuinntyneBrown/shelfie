import { Router } from 'express';
import type { Pool } from 'pg';
import { requireRole } from './authz.ts';
import { processCover, readCover, removeCover, saveCover } from './covers.service.ts';
import { readImage } from './photos.router.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';

export function coversRouter(db: Pool) {
  const router = Router();

  // A reader may give a book she adds its picture; changing or removing it is for grown-ups.
  router.put('/:id/cover', requireSession(db), requireRole('reader'), readImage, async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new Problem(400, 'photo-type');
      res.json({ coverImage: await saveCover(db, householdId, String(req.params['id']), await processCover(req.body)) });
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.delete('/:id/cover', requireSession(db), requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      await removeCover(db, householdId, String(req.params['id']));
      res.status(204).end();
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.get('/:id/cover', requireSession(db), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const cover = await readCover(db, householdId, String(req.params['id']));
    if (!cover) return res.status(404).json({ type: 'not-found' });
    const etag = `"${cover.etag}"`;
    // Served as an image only: never sniffed, never run as a page, kept out of shared caches.
    res.set({
      ETag: etag,
      'Cache-Control': 'private, no-cache',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (req.get('if-none-match') === etag) return res.status(304).end();
    res.type('image/webp').send(cover.image);
  });

  return router;
}
