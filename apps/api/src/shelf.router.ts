import { Router } from 'express';
import type { Pool } from 'pg';
import { requireSession, type RequestSession } from './session.ts';
import { getShelf } from './shelf.service.ts';

export function shelfRouter(db: Pool) {
  const router = Router();
  router.get('/', requireSession(db), async (_req, res) => {
    const session = res.locals['session'] as RequestSession;
    res.json(await getShelf(db, session.householdId));
  });
  return router;
}
