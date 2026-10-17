import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { DEVICE_COOKIE, deviceHousehold, rememberDevice } from './device.ts';
import { requireSession, type RequestSession } from './session.ts';
import { listProfiles, signInWithPassword, signInWithPin } from './auth.service.ts';

const pinSignInSchema = z.object({ profileId: z.string(), pin: z.string().regex(/^[0-9]{4}$/) });

const passwordSignInSchema = z.object({ email: z.email(), password: z.string().min(1) });

const SESSION_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict' as const, maxAge: 30 * 24 * 60 * 60 * 1000 };

export function authRouter(db: DatabaseSync) {
  const router = Router();

  router.get('/session', requireSession(db), (_req, res) => {
    const { profileId, name, role } = res.locals['session'] as RequestSession;
    res.json({ profileId, name, role });
  });

  router.get('/profiles', (req, res) => {
    const householdId = deviceHousehold(db, req.headers.cookie);
    res.json(householdId ? listProfiles(db, householdId) : []);
  });

  router.post('/pin', (req, res) => {
    const householdId = deviceHousehold(db, req.headers.cookie);
    const body = pinSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });
    if (!householdId) return res.status(401).json({ type: 'no-device' });

    const result = signInWithPin(db, householdId, body.data.profileId, body.data.pin);
    if ('lockedUntil' in result) return res.status(423).json({ type: 'pin-locked', lockedUntil: result.lockedUntil });
    if ('triesLeft' in result) return res.status(401).json({ type: 'pin-invalid', triesLeft: result.triesLeft });

    const { id, ...summary } = result.session;
    res.cookie('shelfie_session', id, SESSION_COOKIE);
    res.json(summary);
  });

  router.post('/password', (req, res) => {
    const body = passwordSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });

    const session = signInWithPassword(db, body.data.email, body.data.password);
    if (!session) return res.status(401).json({ type: 'credentials-invalid' });

    const { id, householdId, ...summary } = session;
    const newDevice = rememberDevice(db, householdId, req.headers.cookie);
    if (newDevice) res.cookie('shelfie_device', newDevice, DEVICE_COOKIE);
    res.cookie('shelfie_session', id, SESSION_COOKIE);
    res.json(summary);
  });

  return router;
}
