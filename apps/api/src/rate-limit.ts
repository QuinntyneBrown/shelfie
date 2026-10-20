import type { NextFunction, Request, Response } from 'express';
import { get, run, type Db } from './db.ts';
import type { RequestSession } from './session.ts';

const WINDOW_MINUTES = 10;

type Limited = (req: Request, res: Response, retryAfter: number) => void;

const tooManyAttempts: Limited = (_req, res, retryAfter) => {
  res.set('Retry-After', String(retryAfter));
  res.status(429).json({ type: 'too-many-attempts' });
};

/** At most `limit` requests per key in ten minutes; requests are kept in the sign_in_attempt table. `limited` answers a refused request. */
function rateLimiter(db: Db, limit: number, keyOf: (req: Request, res: Response) => string, limited: Limited = tooManyAttempts) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = keyOf(req, res);
    const now = Date.now();
    const since = new Date(now - WINDOW_MINUTES * 60 * 1000).toISOString();
    await run(db, 'DELETE FROM sign_in_attempt WHERE at < $1', [since]);
    const { attempts, oldest } = (await get<{ attempts: number; oldest: string | null }>(
      db,
      'SELECT COUNT(*) AS attempts, MIN(at) AS oldest FROM sign_in_attempt WHERE source = $1',
      [source],
    ))!;
    if (attempts >= limit) {
      const retryAfter = Math.max(1, Math.ceil((Date.parse(oldest!) + WINDOW_MINUTES * 60 * 1000 - now) / 1000));
      return limited(req, res, retryAfter);
    }
    await run(db, 'INSERT INTO sign_in_attempt (source, at) VALUES ($1, $2)', [source, new Date(now).toISOString()]);
    next();
  };
}

/** At most ten password sign-ins from one source in ten minutes. */
export const passwordSignInLimiter = (db: Db) => rateLimiter(db, 10, (req) => req.ip ?? 'unknown');

/** At most ten provider sign-in starts and callbacks from one source in ten minutes; a navigating browser is sent back rather than shown JSON (L2-159). */
export const providerSignInLimiter = (db: Db, limited: Limited) => rateLimiter(db, 10, (req) => `provider:${req.ip ?? 'unknown'}`, limited);

/** At most five review-assistant requests per parent in ten minutes. Use after `requireSession`. */
export const assistLimiter = (db: Db) =>
  rateLimiter(db, 5, (_req, res) => `assist:${(res.locals['session'] as RequestSession).profileId}`);

/** At most five asks for suggested questions per household in ten minutes, since each one costs money. Use after `requireSession`. */
export const suggestionLimiter = (db: Db) =>
  rateLimiter(db, 5, (_req, res) => `suggest:${(res.locals['session'] as RequestSession).householdId}`);

/** At most sixty title lookups from one source in ten minutes: a typist pauses a few times per book, not sixty. */
export const lookupLimiter = (db: Db) => rateLimiter(db, 60, (req) => `lookup:${req.ip ?? 'unknown'}`);

/** At most ten feedback notes per person in ten minutes, so nobody can flood the table. Use after `requireSession`. */
export const feedbackLimiter = (db: Db) =>
  rateLimiter(db, 10, (_req, res) => `feedback:${(res.locals['session'] as RequestSession).profileId}`);

/** At most three confirm-your-e-mail links per parent in ten minutes (L2-149). Use after `requireSession`. */
export const verifyResendLimiter = (db: Db) =>
  rateLimiter(db, 3, (_req, res) => `verify:${(res.locals['session'] as RequestSession).profileId}`);

/** At most twenty subscription requests per person in ten minutes. Use after `requireSession`. */
export const pushLimiter = (db: Db) =>
  rateLimiter(db, 20, (_req, res) => `push:${(res.locals['session'] as RequestSession).profileId}`);
