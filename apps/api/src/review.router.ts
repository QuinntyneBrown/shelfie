import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { requireRole } from './authz.ts';
import { overview } from './review.service.ts';
import { requireSession, type RequestSession } from './session.ts';

export function reviewRouter(db: DatabaseSync) {
  const router = Router();

  router.get('/review', requireSession(db), requireRole('grown_up'), (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(overview(db, householdId));
  });

  return router;
}
