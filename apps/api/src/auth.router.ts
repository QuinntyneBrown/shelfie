import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { passwordSignInLimiter } from './rate-limit.ts';
import { readCookie, requireSession, type RequestSession } from './session.ts';
import { requestPasswordReset, resetPassword, signInWithPassword, type Session } from './auth.service.ts';
import type { Mail } from './mail.ts';

const forgotPasswordSchema = z.object({ email: z.email() });

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

const passwordSignInSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1), remember: z.boolean() });

const SESSION_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict' as const };
const REMEMBERED_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/** Sets the session cookie; a remembered session's cookie outlives the browser, the other ends with it. */
export function setSessionCookie(res: Response, session: Session) {
  res.cookie('shelfie_session', session.id, session.remember ? { ...SESSION_COOKIE, maxAge: REMEMBERED_FOR_MS } : SESSION_COOKIE);
}

export function sessionSummary({ id, remember, ...summary }: Session) {
  return summary;
}

export function authRouter(db: DatabaseSync, mail?: Mail) {
  const router = Router();

  /** A new sign-in always gets a new session id; the browser's previous one stops working. */
  const endPreviousSession = (cookieHeader: string | undefined) => {
    const previous = readCookie(cookieHeader, 'shelfie_session');
    if (previous) db.prepare('DELETE FROM session WHERE id = ?').run(previous);
  };

  router.get('/session', requireSession(db), (_req, res) => {
    const { profileId, name, username, role, color, email, theme } = res.locals['session'] as RequestSession;
    res.json({ profileId, name, username, role, color, email, theme });
  });

  router.post('/sign-out', (req, res) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    if (id) db.prepare('DELETE FROM session WHERE id = ?').run(id);
    res.clearCookie('shelfie_session');
    res.status(204).end();
  });

  router.post('/forgot-password', async (req, res) => {
    const body = forgotPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await requestPasswordReset(db, body.data.email, mail);
    res.status(202).end();
  });

  router.post('/reset-password', (req, res) => {
    const body = resetPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = resetPassword(db, body.data.token, body.data.password);
    if (!session) return res.status(400).json({ type: 'reset-token-invalid' });

    endPreviousSession(req.headers.cookie);
    setSessionCookie(res, session);
    res.json(sessionSummary(session));
  });

  router.post('/password', passwordSignInLimiter(db), (req, res) => {
    const body = passwordSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = signInWithPassword(db, body.data.username, body.data.password, body.data.remember);
    if (!session) return res.status(401).json({ type: 'credentials-invalid' });

    endPreviousSession(req.headers.cookie);
    setSessionCookie(res, session);
    res.json(sessionSummary(session));
  });

  return router;
}
