import type { NextFunction, Request, Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { readCookie } from './device.ts';

export interface RequestSession {
  profileId: string;
  name: string;
  householdId: string;
  role: 'reader' | 'grown_up';
}

/** Rejects requests without a live `shelfie_session`; otherwise puts the session on `res.locals.session`. */
export function requireSession(db: DatabaseSync) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    const row = id
      ? (db
          .prepare(
            'SELECT p.id AS profileId, p.name AS name, p.household_id AS householdId, p.role AS role, s.expires_at AS expiresAt FROM session s JOIN profile p ON p.id = s.profile_id WHERE s.id = ?',
          )
          .get(id) as (RequestSession & { expiresAt: string }) | undefined)
      : undefined;
    if (!row) return res.status(401).json({ type: 'no-session' });
    if (row.expiresAt <= new Date().toISOString()) {
      db.prepare('DELETE FROM session WHERE id = ?').run(id);
      res.clearCookie('shelfie_session');
      return res.status(401).json({ type: 'session-expired' });
    }
    res.locals['session'] = row;
    next();
  };
}
