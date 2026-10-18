import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { DEVICE_COOKIE, deviceHousehold, readCookie, rememberDevice } from './device.ts';
import { passwordSignInLimiter } from './rate-limit.ts';
import { requireSession, type RequestSession } from './session.ts';
import { listProfiles, requestPasswordReset, resetPassword, signInWithPassword, signInWithPin } from './auth.service.ts';

const pinSignInSchema = z.object({ profileId: z.string(), pin: z.string().regex(/^[0-9]{4}$/) });

const forgotPasswordSchema = z.object({ email: z.email() });

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

const passwordSignInSchema = z.object({ email: z.email(), password: z.string().min(1) });

const SESSION_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict' as const, maxAge: 30 * 24 * 60 * 60 * 1000 };

export function authRouter(db: DatabaseSync) {
  const router = Router();

  /** A new sign-in always gets a new session id; the browser's previous one stops working. */
  const endPreviousSession = (cookieHeader: string | undefined) => {
    const previous = readCookie(cookieHeader, 'shelfie_session');
    if (previous) db.prepare('DELETE FROM session WHERE id = ?').run(previous);
  };

  router.get('/session', requireSession(db), (_req, res) => {
    const { profileId, name, role, color, email, theme } = res.locals['session'] as RequestSession;
    res.json({ profileId, name, role, color, email, theme });
  });

  router.post('/sign-out', (req, res) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    if (id) db.prepare('DELETE FROM session WHERE id = ?').run(id);
    res.clearCookie('shelfie_session');
    res.status(204).end();
  });

  router.get('/profiles', (req, res) => {
    const householdId = deviceHousehold(db, req.headers.cookie);
    res.json(householdId ? listProfiles(db, householdId) : []);
  });

  router.post('/pin', (req, res) => {
    const householdId = deviceHousehold(db, req.headers.cookie);
    const body = pinSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    if (!householdId) return res.status(401).json({ type: 'no-device' });

    const result = signInWithPin(db, householdId, body.data.profileId, body.data.pin);
    if ('lockedUntil' in result) return res.status(423).json({ type: 'pin-locked', lockedUntil: result.lockedUntil });
    if ('triesLeft' in result) return res.status(401).json({ type: 'pin-invalid', triesLeft: result.triesLeft });

    const { id, ...summary } = result.session;
    endPreviousSession(req.headers.cookie);
    res.cookie('shelfie_session', id, SESSION_COOKIE);
    res.json(summary);
  });

  router.post('/forgot-password', async (req, res) => {
    const body = forgotPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await requestPasswordReset(db, body.data.email);
    res.status(202).end();
  });

  router.post('/reset-password', (req, res) => {
    const body = resetPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = resetPassword(db, body.data.token, body.data.password);
    if (!session) return res.status(400).json({ type: 'reset-token-invalid' });

    const { id, householdId, ...summary } = session;
    const newDevice = rememberDevice(db, householdId, req.headers.cookie);
    if (newDevice) res.cookie('shelfie_device', newDevice, DEVICE_COOKIE);
    endPreviousSession(req.headers.cookie);
    res.cookie('shelfie_session', id, SESSION_COOKIE);
    res.json(summary);
  });

  router.post('/password', passwordSignInLimiter(db), (req, res) => {
    const body = passwordSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = signInWithPassword(db, body.data.email, body.data.password);
    if (!session) return res.status(401).json({ type: 'credentials-invalid' });

    const { id, householdId, ...summary } = session;
    const newDevice = rememberDevice(db, householdId, req.headers.cookie);
    if (newDevice) res.cookie('shelfie_device', newDevice, DEVICE_COOKIE);
    endPreviousSession(req.headers.cookie);
    res.cookie('shelfie_session', id, SESSION_COOKIE);
    res.json(summary);
  });

  return router;
}
