import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { getSettings, updateSettings } from './settings.service.ts';

const name = z.string().trim().min(1).max(40);
const settingsPatchSchema = z.object({
  reader: z.object({
    name,
    color: z.enum(['rose', 'sky', 'sun', 'mint', 'lilac']),
    pin: z.string().regex(/^[0-9]{4}$/).optional(),
  }),
  grownUp: z.object({ name, newPassword: z.string().min(8).optional(), currentPassword: z.string().optional() }),
});

export function settingsRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db), requireRole('grown_up'));

  router.get('/', (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(getSettings(db, householdId));
  });

  router.patch('/', (req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    const body = settingsPatchSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });
    try {
      res.json(updateSettings(db, householdId, profileId, body.data));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  return router;
}
