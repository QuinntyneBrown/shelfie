import type { NextFunction, Request, Response } from 'express';
import { get, run, type Db } from './db.ts';
import { ownPhotoUrl } from './photos.service.ts';

/** A session lasts this long after its last request. */
export const SESSION_DAYS = 30;

export type Role = 'reader' | 'parent' | 'author' | 'volunteer';

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
}

/** A session of any role; an author's or volunteer's has no household (ADR-0019). */
export interface AnySession extends Omit<RequestSession, 'householdId' | 'role'> {
  householdId: string | null;
  role: Role;
}

export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** Loads the live `shelfie_session` onto `res.locals.session` and passes it to `admit`; answers 401 when there is none or it ran out. */
function loadSession(db: Db, admit: (session: AnySession, res: Response, next: NextFunction) => unknown) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = readCookie(req.headers.cookie, 'shelfie_session');
    const row = id
      ? await get<Omit<AnySession, 'photo'> & { expiresAt: string; photoEtag: string | null }>(
          db,
          `SELECT p.id AS "profileId", p.name, p.username, p.color, p.email, COALESCE(h.theme, 'device') AS theme, p.household_id AS "householdId", p.role,
                  s.expires_at AS "expiresAt", pp.etag AS "photoEtag"
             FROM session s JOIN profile p ON p.id = s.profile_id LEFT JOIN household h ON h.id = p.household_id
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
    const { expiresAt, photoEtag, ...session } = row;
    const loaded: AnySession = { ...session, photo: photoEtag ? ownPhotoUrl(session.role, session.profileId, photoEtag) : null };
    res.locals['session'] = loaded;
    admit(loaded, res, next);
  };
}

/**
 * The household guard: rejects requests without a live `shelfie_session`, turns an author or volunteer away with
 * 403 `household-only` (ADR-0019), and otherwise puts the session on `res.locals.session`.
 */
export function requireSession(db: Db) {
  return loadSession(db, (session, res, next) => {
    if (session.householdId === null) return res.status(403).json({ type: 'household-only' });
    next();
  });
}

/** An author's or volunteer's session (ADR-0019). */
export interface DirectorySession extends Omit<AnySession, 'householdId' | 'role' | 'theme'> {
  role: 'author' | 'volunteer';
}

/**
 * The guard of an author's or volunteer's own routes: a parent or reader is answered 403 `directory-only`, and a
 * volunteer on an authors-only route 403 `authors-only`. Puts a `DirectorySession` on `res.locals.session`.
 */
export function requireDirectorySession(db: Db, roles: DirectorySession['role'][] = ['author', 'volunteer']) {
  return loadSession(db, (session, res, next) => {
    if (session.role !== 'author' && session.role !== 'volunteer') return res.status(403).json({ type: 'directory-only' });
    if (!roles.includes(session.role)) return res.status(403).json({ type: 'authors-only' });
    const { householdId, theme, ...own } = session;
    res.locals['session'] = own;
    next();
  });
}

/** Any signed-in person, of any role; for the routes every account shares, such as reading its own session. */
export function requireAnySession(db: Db) {
  return loadSession(db, (_session, _res, next) => next());
}
