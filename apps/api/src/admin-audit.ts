import type { NextFunction, Request, Response } from 'express';
import { run, type Db } from './db.ts';

/**
 * Writes one admin_audit row when each admin response finishes, whatever its status. Only the time, token id,
 * method, route pattern, target id, dry-run flag, status and request id are kept: never a body, header or token.
 */
export function adminAudit(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      run(db, 'INSERT INTO admin_audit (at, token_id, method, route, target_id, dry_run, status, request_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
        new Date().toISOString(),
        (res.locals['adminToken'] as { id: string } | undefined)?.id ?? null,
        req.method,
        (res.locals['adminRoute'] as string | undefined) ?? 'unmatched',
        (res.locals['adminTarget'] as string | undefined) ?? null,
        req.query['dryRun'] === 'true' ? 1 : 0,
        res.statusCode,
        String(res.locals['requestId']),
      ]).catch(() => {});
    });
    next();
  };
}
