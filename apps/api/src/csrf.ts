import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuses state-changing requests that did not come from the app: the app sends X-Requested-With,
 * which a cross-site form or script cannot. The SameSite=Strict cookie is a second, separate defence.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const fetchSite = req.get('sec-fetch-site');
  const origin = req.get('origin');
  const ownOrigins = [process.env.APP_URL ?? 'http://localhost:4200', `${req.protocol}://${req.get('host')}`];
  const crossSite =
    fetchSite === 'cross-site' ||
    fetchSite === 'same-site' ||
    (origin !== undefined && !ownOrigins.includes(origin)) ||
    req.get('x-requested-with') !== 'Shelfie';
  if (crossSite) return res.status(403).json({ type: 'cross-site' });
  next();
}
