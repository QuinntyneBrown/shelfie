import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { requireSession, type RequestSession } from './session.ts';
import { getShelf } from './shelf.service.ts';

export function shelfRouter(db: DatabaseSync) {
  const router = Router();
  router.get('/', requireSession(db), (_req, res) => {
    const session = res.locals['session'] as RequestSession;
    res.json(getShelf(db, session.householdId));
  });
  return router;
}
