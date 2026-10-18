import type { NextFunction, Request, Response } from 'express';
import { get, run, type Db } from './db.ts';

const WINDOW_MINUTES = 10;
const LIMIT = 10;

/** At most ten password sign-ins from one source in ten minutes; attempts are kept in the database. */
export function passwordSignInLimiter(db: Db) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = req.ip ?? 'unknown';
    const now = Date.now();
    const since = new Date(now - WINDOW_MINUTES * 60 * 1000).toISOString();
    await run(db, 'DELETE FROM sign_in_attempt WHERE at < $1', [since]);
    const { attempts, oldest } = (await get<{ attempts: number; oldest: string | null }>(
      db,
      'SELECT COUNT(*) AS attempts, MIN(at) AS oldest FROM sign_in_attempt WHERE source = $1',
      [source],
    ))!;
    if (attempts >= LIMIT) {
      const retryAfter = Math.max(1, Math.ceil((Date.parse(oldest!) + WINDOW_MINUTES * 60 * 1000 - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ type: 'too-many-attempts' });
    }
    await run(db, 'INSERT INTO sign_in_attempt (source, at) VALUES ($1, $2)', [source, new Date(now).toISOString()]);
    next();
  };
}
