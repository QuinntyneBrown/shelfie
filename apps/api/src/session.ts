import type { NextFunction, Request, Response } from 'express';
import { get, run, type Db } from './db.ts';
import { PHOTO_COLUMN } from './photos.service.ts';

/** A session lasts this long after its last request. */
export const SESSION_DAYS = 30;

export interface RequestSession {
  profileId: string;
  name: string;
  username: string;
  color: string;
  email: string | null;
  theme: string;
  householdId: string;
  role: 'reader' | 'parent';
  /** The URL of the person's own photo, or null when they have none. */
  photo: string | null;
  /** Whether the household has finished or skipped the set-up wizard (L2-137). */
  onboarded: boolean;
  /** Whether the person's e-mail is confirmed (L2-146). */
  emailVerified: boolean;
}

export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** Rejects requests without a live `shelfie_session`; otherwise puts the session on `res.locals.session`. */
export function requireSession(db: Db) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    const row = id
      ? await get<RequestSession & { expiresAt: string }>(
          db,
          `SELECT p.id AS "profileId", p.name, p.username, p.color, p.email, h.theme, p.household_id AS "householdId", p.role, h.onboarded, p.email_verified_at IS NOT NULL AS "emailVerified", s.expires_at AS "expiresAt",
                  ${PHOTO_COLUMN}
             FROM session s JOIN profile p ON p.id = s.profile_id JOIN household h ON h.id = p.household_id
             LEFT JOIN profile_photo pp ON pp.profile_id = p.id WHERE s.id = $1`,
          [id],
        )
      : undefined;
    if (!row) return res.status(401).json({ type: 'no-session' });
    if (row.expiresAt <= new Date().toISOString()) {
      await run(db, 'DELETE FROM session WHERE id = $1', [id]);
      res.clearCookie('shelfie_session');
      return res.status(401).json({ type: 'session-expired' });
    }
    const slidTo = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await run(db, 'UPDATE session SET expires_at = $1 WHERE id = $2', [slidTo, id]);
    const { expiresAt, ...session } = row;
    res.locals['session'] = session;
    next();
  };
}
