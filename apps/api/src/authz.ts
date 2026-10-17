import type { NextFunction, Request, Response } from 'express';
import type { RequestSession } from './session.ts';

/** Use after `requireSession`. A reader session is turned away from grown-ups-only routes with a 403. */
export function requireRole(role: 'reader' | 'grown_up') {
  return (_req: Request, res: Response, next: NextFunction) => {
    const session = res.locals['session'] as RequestSession;
    if (role === 'grown_up' && session.role !== 'grown_up') return res.status(403).json({ type: 'grown-ups-only' });
    next();
  };
}
