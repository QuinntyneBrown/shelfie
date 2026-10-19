import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { run } from './db.ts';
import { passwordSignInLimiter } from './rate-limit.ts';
import { readCookie, requireSession, type RequestSession } from './session.ts';
import { requestPasswordReset, resetPassword, signInWithPassword, signInWithProvider, signUp, type Session } from './auth.service.ts';
import { Problem } from './problem.ts';
import { acceptInvite, getInvite } from './invites.service.ts';
import type { Mail } from './mail.ts';
import { authorizeUrl, exchangeCode, pkce, type OAuthProvider, type ProviderName } from './oauth.ts';
import { randomBytes } from 'node:crypto';

const forgotPasswordSchema = z.object({ email: z.email() });

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

const passwordSignInSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1), remember: z.boolean() });

export const username = z.string().regex(/^[A-Za-z0-9._]{3,20}$/);
export const password = z.string().min(8);
const signUpSchema = z.object({ name: z.string().trim().min(1).max(40), email: z.email(), username, password });
const acceptInviteSchema = z.object({ token: z.string().min(1), name: z.string().trim().min(1).max(40), username, password });

const SESSION_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict' as const };
// The provider round trip's state and PKCE verifier (ADR-0018): Lax, because the provider's redirect back is cross-site.
const OAUTH_COOKIE = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/auth', maxAge: 10 * 60 * 1000 };

interface OAuthStart {
  provider: ProviderName;
  state: string;
  verifier: string;
  remember: boolean;
  from: 'sign-in' | 'sign-up';
}

function readOAuthStart(cookieHeader: string | undefined): OAuthStart | null {
  const raw = readCookie(cookieHeader, 'shelfie_oauth');
  try {
    return raw ? (JSON.parse(Buffer.from(raw, 'base64url').toString()) as OAuthStart) : null;
  } catch {
    return null;
  }
}
const REMEMBERED_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/** Sets the session cookie; a remembered session's cookie outlives the browser, the other ends with it. */
export function setSessionCookie(res: Response, session: Session) {
  res.cookie('shelfie_session', session.id, session.remember ? { ...SESSION_COOKIE, maxAge: REMEMBERED_FOR_MS } : SESSION_COOKIE);
}

export function sessionSummary({ id, remember, ...summary }: Session) {
  return summary;
}

export function authRouter(db: Pool, mail?: Mail, providers: OAuthProvider[] = []) {
  const router = Router();

  /** Which providers a parent can continue with; names only, never the ids or secrets (L2-142). */
  router.get('/providers', (_req, res) => {
    res.json({ providers: providers.map((provider) => provider.name) });
  });

  /** A new sign-in always gets a new session id; the browser's previous one stops working. */
  const endPreviousSession = async (cookieHeader: string | undefined) => {
    const previous = readCookie(cookieHeader, 'shelfie_session');
    if (previous) await run(db, 'DELETE FROM session WHERE id = $1', [previous]);
  };

  router.get('/session', requireSession(db), (_req, res) => {
    const { profileId, name, username, role, color, email, theme, photo } = res.locals['session'] as RequestSession;
    res.json({ profileId, name, username, role, color, email, theme, photo });
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

  const providerOf = (name: unknown) => providers.find((provider) => provider.name === name);
  const redirectUri = (provider: OAuthProvider) => `${process.env.APP_URL ?? 'http://localhost:4200'}/api/auth/${provider.name}/callback`;

  /** Sends the browser to the provider's consent screen, keeping what the callback needs in the start cookie (L2-137, L2-142). */
  router.get('/:provider/start', (req, res) => {
    const provider = providerOf(req.params['provider']);
    if (!provider) return res.status(404).json({ type: 'not-found' });
    const start: OAuthStart = {
      provider: provider.name,
      state: randomBytes(32).toString('base64url'),
      ...pkce(),
      remember: req.query['remember'] !== '0',
      from: req.query['from'] === 'sign-up' ? 'sign-up' : 'sign-in',
    };
    const { challenge, ...kept } = start as OAuthStart & { challenge: string };
    res.cookie('shelfie_oauth', Buffer.from(JSON.stringify(kept)).toString('base64url'), OAUTH_COOKIE);
    res.redirect(authorizeUrl(provider, redirectUri(provider), start.state, challenge));
  });

  /** Back from the provider: checks the state, trades the code for the identity, and signs the parent in or returns them with a reason (L2-138 to L2-142). */
  router.get('/:provider/callback', async (req, res) => {
    const provider = providerOf(req.params['provider']);
    if (!provider) return res.status(404).json({ type: 'not-found' });
    const start = readOAuthStart(req.headers.cookie);
    res.clearCookie('shelfie_oauth', { path: OAUTH_COOKIE.path });
    const back = (reason: string) => res.redirect(`/${start?.from ?? 'sign-in'}?reason=${reason}&provider=${provider.name}`);
    const { state, code, error } = req.query;
    if (!start || start.provider !== provider.name || typeof state !== 'string' || state !== start.state) return back('failed');
    if (error !== undefined) return back(error === 'access_denied' ? 'cancelled' : 'failed');
    if (typeof code !== 'string') return back('failed');
    let identity;
    try {
      identity = await exchangeCode(provider, code, start.verifier, redirectUri(provider));
    } catch {
      return back('failed');
    }
    try {
      const session = await signInWithProvider(db, provider.name, identity, start.remember);
      await endPreviousSession(req.headers.cookie);
      setSessionCookie(res, session);
      res.redirect('/review');
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      back(e.type);
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
