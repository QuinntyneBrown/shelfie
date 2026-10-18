import type { NextFunction, Request, Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';

const WINDOW_MINUTES = 10;
const LIMIT = 10;

/** At most ten password sign-ins from one source in ten minutes; attempts are kept in the database. */
export function passwordSignInLimiter(db: DatabaseSync) {
  return (req: Request, res: Response, next: NextFunction) => {
    const source = req.ip ?? 'unknown';
    const now = Date.now();
    const since = new Date(now - WINDOW_MINUTES * 60 * 1000).toISOString();
    db.prepare('DELETE FROM sign_in_attempt WHERE at < ?').run(since);
    const { attempts, oldest } = db
      .prepare('SELECT COUNT(*) AS attempts, MIN(at) AS oldest FROM sign_in_attempt WHERE source = ?')
      .get(source) as { attempts: number; oldest: string | null };
    if (attempts >= LIMIT) {
      const retryAfter = Math.max(1, Math.ceil((Date.parse(oldest!) + WINDOW_MINUTES * 60 * 1000 - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ type: 'too-many-attempts' });
    }
    db.prepare('INSERT INTO sign_in_attempt (source, at) VALUES (?, ?)').run(source, new Date(now).toISOString());
    next();
  };
}
