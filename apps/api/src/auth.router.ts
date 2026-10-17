import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { deviceHousehold } from './device.ts';
import { listProfiles, signInWithPin } from './auth.service.ts';

const pinSignInSchema = z.object({ profileId: z.string(), pin: z.string().regex(/^[0-9]{4}$/) });

export function authRouter(db: DatabaseSync) {
  const router = Router();

  router.get('/profiles', (req, res) => {
    const householdId = deviceHousehold(req.headers.cookie);
    res.json(householdId ? listProfiles(db, householdId) : []);
  });

  router.post('/pin', (req, res) => {
    const householdId = deviceHousehold(req.headers.cookie);
    const body = pinSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });
    if (!householdId) return res.status(401).json({ type: 'no-device' });

    const session = signInWithPin(db, householdId, body.data.profileId, body.data.pin);
    if (!session) return res.status(401).json({ type: 'pin-invalid' });

    const { id, ...summary } = session;
    res.cookie('shelfie_session', id, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json(summary);
  });

  return router;
}
