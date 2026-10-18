import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { searchBooks, type Providers } from './book-search.service.ts';
import { Problem } from './problem.ts';
import { lookupLimiter } from './rate-limit.ts';
import { requireSession } from './session.ts';
import { validationProblem } from './validation.ts';

const querySchema = z.object({ q: z.string().trim().min(3).max(120) });

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

  return router;
}
