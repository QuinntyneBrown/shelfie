import { Router } from 'express';
import type { Pool } from 'pg';
import { Problem } from './problem.ts';
import { readerFor } from './readers.service.ts';
import { requireSession, type RequestSession } from './session.ts';
import { getShelf } from './shelf.service.ts';

export function shelfRouter(db: Pool) {
  const router = Router();
  router.get('/', requireSession(db), async (req, res) => {
    const session = res.locals['session'] as RequestSession;
    try {
      res.json(await getShelf(db, session.householdId, await readerFor(db, session, req.query['reader'])));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });
  return router;
}
