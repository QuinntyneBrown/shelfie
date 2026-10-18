import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { boundCoverIds, searchBooks, WORK_KEY, type Providers } from './book-search.service.ts';
import { fetchCatalogueCover } from './catalogue.ts';
import { Problem } from './problem.ts';
import { lookupLimiter } from './rate-limit.ts';
import { requireSession } from './session.ts';
import { validationProblem } from './validation.ts';

const querySchema = z.object({ q: z.string().trim().min(3).max(120) });
const workSchema = z.object({ work: z.string().regex(WORK_KEY) });

/** Looks a typed title up for Add a book. Mounted before the books routes, so `/search` is never read as a book id. */
export function bookSearchRouter(db: Pool, providers: Providers) {
  const router = Router();

  router.get('/search', requireSession(db), lookupLimiter(db), async (req, res) => {
    const query = querySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json(validationProblem(query.error));
    try {
      res.json({ matches: await searchBooks(providers, query.data.q) });
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  const COVER_TIMEOUT_MS = 5000;

  // The other covers the catalogue holds for a picked book; each id then loads through the cover route below.
  router.get('/search/covers', requireSession(db), lookupLimiter(db), async (req, res) => {
    const query = workSchema.safeParse(req.query);
    if (!query.success) return res.status(400).json(validationProblem(query.error));
    try {
      const answer = await providers.workCovers(query.data.work, AbortSignal.timeout(COVER_TIMEOUT_MS)).catch(() => {
        throw new Problem(503, 'lookup-unavailable');
      });
      res.json({ covers: boundCoverIds(answer) });
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  // The catalogue cover, re-encoded by the cover rules; served as an image only and kept private.
  router.get('/search/covers/:coverId', requireSession(db), async (req, res) => {
    try {
      const image = await fetchCatalogueCover(String(req.params['coverId']), AbortSignal.timeout(COVER_TIMEOUT_MS), providers.coverFetch);
      res.set({ 'Cache-Control': 'private, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" });
      res.type('image/webp').send(image);
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
