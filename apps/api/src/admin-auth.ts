import type { NextFunction, Request, Response } from 'express';
import { get, run, type Db } from './db.ts';
import { hashToken, type AdminTokenView, type Scope } from './admin-token.ts';

/** Sends an admin problem document; every one names the request id. */
export function refuse(res: Response, status: number, type: string, extra: Record<string, unknown> = {}) {
  res.status(status).json({ type, ...extra, requestId: res.locals['requestId'] });
}

/** Notes the route pattern and target id for the audit row, which is written after Express has left the route. */
function noteRoute(req: Request, res: Response, next: NextFunction) {
  res.locals['adminRoute'] = `${req.baseUrl}${req.route.path}`;
  res.locals['adminTarget'] = req.params['id'];
  next();
}

/** Accepts only `Authorization: Bearer <token>` naming a live token; puts it on `res.locals.adminToken`. */
export function requireAdminToken(db: Db) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
    if (!token) return refuse(res, 401, 'token-missing');
    const row = await get<{ id: string; name: string; scopes: string; expires_at: string; revoked_at: string | null }>(
      db,
      'SELECT id, name, scopes, expires_at, revoked_at FROM admin_token WHERE token_hash = $1',
      [hashToken(token)],
    );
    if (!row) return refuse(res, 401, 'token-invalid');
    res.locals['adminToken'] = { id: row.id };
    if (row.revoked_at) return refuse(res, 401, 'token-revoked');
    if (row.expires_at <= new Date().toISOString()) return refuse(res, 401, 'token-expired', { expiresAt: row.expires_at });
    await run(db, 'UPDATE admin_token SET last_used_at = $1 WHERE id = $2', [new Date().toISOString(), row.id]);
    res.locals['adminToken'] = { id: row.id, name: row.name, scopes: row.scopes.split(' ') as Scope[], expiresAt: row.expires_at } satisfies Omit<
      AdminTokenView,
      'lastUsedAt' | 'revokedAt'
    >;
    next();
  };
}

/** Use after `requireAdminToken`. */
export function requireScope(scope: Scope) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!(res.locals['adminToken'] as { scopes: Scope[] }).scopes.includes(scope)) return refuse(res, 403, 'scope-missing', { scope });
    next();
  };
}

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

/** At most 60 admin calls per source in a one-minute window, counted in memory. */
export function adminRateLimit() {
  const windows = new Map<string, { start: number; count: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const source = req.ip ?? 'unknown';
    let window = windows.get(source);
    if (!window || now - window.start >= RATE_WINDOW_MS) windows.set(source, (window = { start: now, count: 0 }));
    if (++window.count > RATE_LIMIT) {
      res.set('Retry-After', String(Math.ceil((window.start + RATE_WINDOW_MS - now) / 1000)));
      return refuse(res, 429, 'too-many-requests');
    }
    next();
  };
}

/** The checks every admin route runs, in order. */
export function adminGuard(db: Db) {
  const limit = adminRateLimit();
  const token = requireAdminToken(db);
  return (scope: Scope) => [noteRoute, limit, token, requireScope(scope)];
}
