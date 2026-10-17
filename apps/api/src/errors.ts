import { randomInt } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Turns any thrown error into a 500 problem document naming a request id; the stack stays in the log. */
export function problemDetailsHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  // The body parser's own errors: too large, or not JSON at all.
  const parserError = error as { type?: string };
  if (parserError.type === 'entity.too.large') return res.status(413).json({ type: 'payload-too-large' });
  if (parserError.type === 'entity.parse.failed') return res.status(400).json({ type: 'validation', errors: [] });

  const requestId = `SHF-${randomInt(0x10000).toString(16).toUpperCase().padStart(4, '0')}`;
  console.error(requestId, error);
  res.status(500).json({ type: 'about:blank', title: 'Something went wrong', status: 500, requestId });
}
