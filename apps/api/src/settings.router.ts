import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { getSettings, updateSettings } from './settings.service.ts';

const settingsPatchSchema = z.object({
  theme: z.enum(['device', 'light', 'dark']),
  notifications: z.strictObject({ chapterLogged: z.boolean(), feedback: z.boolean(), bookReward: z.boolean(), streakReward: z.boolean() }).optional(),
  account: z.object({
    name: z.string().trim().min(1).max(40),
    email: z.email(),
    newPassword: z.string().min(8).optional(),
    currentPassword: z.string().optional(),
  }),
});

export function settingsRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db), requireRole('parent'));

  router.get('/', async (_req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    res.json(await getSettings(db, householdId, profileId));
  });

  router.patch('/', async (req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    const body = settingsPatchSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.json(await updateSettings(db, householdId, profileId, body.data));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  return router;
}
