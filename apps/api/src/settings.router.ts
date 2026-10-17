import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { requireRole } from './authz.ts';
import { requireSession, type RequestSession } from './session.ts';
import { getSettings } from './settings.service.ts';

export function settingsRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db), requireRole('grown_up'));

  router.get('/', (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(getSettings(db, householdId));
  });

  return router;
}
