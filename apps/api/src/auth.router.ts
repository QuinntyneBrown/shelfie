import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { run } from './db.ts';
import { passwordSignInLimiter } from './rate-limit.ts';
import { readCookie, requireSession, type RequestSession } from './session.ts';
import { requestPasswordReset, resetPassword, signInWithPassword, signUp, type Session } from './auth.service.ts';
import { Problem } from './problem.ts';
import { acceptInvite, getInvite } from './invites.service.ts';
import type { Mail } from './mail.ts';
import type { Log } from './logging.ts';
import { sendVerification } from './verify-email.service.ts';

const forgotPasswordSchema = z.object({ email: z.email() });

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

const passwordSignInSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1), remember: z.boolean() });

export const username = z.string().regex(/^[A-Za-z0-9._]{3,20}$/);
export const password = z.string().min(8);
const signUpSchema = z.object({ name: z.string().trim().min(1).max(40), email: z.email(), username, password });
const acceptInviteSchema = z.object({ token: z.string().min(1), name: z.string().trim().min(1).max(40), username, password });

const SESSION_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict' as const };
const REMEMBERED_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/** Sets the session cookie; a remembered session's cookie outlives the browser, the other ends with it. */
export function setSessionCookie(res: Response, session: Session) {
  res.cookie('shelfie_session', session.id, session.remember ? { ...SESSION_COOKIE, maxAge: REMEMBERED_FOR_MS } : SESSION_COOKIE);
}

export function sessionSummary({ id, remember, ...summary }: Session) {
  return summary;
}

export function authRouter(db: Pool, mail?: Mail) {
  const router = Router();

  /** A new sign-in always gets a new session id; the browser's previous one stops working. */
  const endPreviousSession = async (cookieHeader: string | undefined) => {
    const previous = readCookie(cookieHeader, 'shelfie_session');
    if (previous) await run(db, 'DELETE FROM session WHERE id = $1', [previous]);
  };

  router.get('/session', requireSession(db), (_req, res) => {
    const { profileId, name, username, role, color, email, theme, photo, onboarded, emailVerified } = res.locals['session'] as RequestSession;
    res.json({ profileId, name, username, role, color, email, theme, photo, onboarded, emailVerified });
  });

  router.post('/sign-out', async (req, res) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    if (id) await run(db, 'DELETE FROM session WHERE id = $1', [id]);
    res.clearCookie('shelfie_session');
    res.status(204).end();
  });

  router.post('/forgot-password', async (req, res) => {
    const body = forgotPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await requestPasswordReset(db, body.data.email, mail);
    res.status(202).end();
  });

  router.post('/reset-password', async (req, res) => {
    const body = resetPasswordSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = await resetPassword(db, body.data.token, body.data.password);
    if (!session) return res.status(400).json({ type: 'reset-token-invalid' });

    await endPreviousSession(req.headers.cookie);
    setSessionCookie(res, session);
    res.json(sessionSummary(session));
  });

  router.post('/sign-up', async (req, res) => {
    const body = signUpSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      const session = await signUp(db, body.data);
      // Sign-up does not wait for the provider; a failed send is logged with the request id only (L2-144, L2-152).
      const log = res.locals['log'] as Log;
      sendVerification(db, { id: session.profileId, name: session.name, email: session.email! }, mail).catch(() =>
        log({ level: 'error', time: new Date().toISOString(), requestId: res.locals['requestId'], event: 'verify-mail-failed' }),
      );
      await endPreviousSession(req.headers.cookie);
      setSessionCookie(res, session);
      res.status(201).json(sessionSummary(session));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  router.get('/invites/:token', async (req, res) => {
    try {
      res.json(await getInvite(db, String(req.params['token'])));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  router.post('/accept-invite', async (req, res) => {
    const body = acceptInviteSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      const session = await acceptInvite(db, body.data);
      await endPreviousSession(req.headers.cookie);
      setSessionCookie(res, session);
      res.status(201).json(sessionSummary(session));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  router.post('/password', passwordSignInLimiter(db), async (req, res) => {
    const body = passwordSignInSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));

    const session = await signInWithPassword(db, body.data.username, body.data.password, body.data.remember);
    if (!session) return res.status(401).json({ type: 'credentials-invalid' });

    await endPreviousSession(req.headers.cookie);
    setSessionCookie(res, session);
    res.json(sessionSummary(session));
  });

  return router;
}
