import { newRequestId, type Log } from './logging.ts';
import type { NextFunction, Request, Response } from 'express';

/** Turns any thrown error into a 500 problem document naming a request id; the stack stays in the log. */
export function problemDetailsHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  // The body parser's own errors: too large, or not JSON at all.
  const parserError = error as { type?: string };
  if (parserError.type === 'entity.too.large') return res.status(413).json({ type: 'payload-too-large' });
  if (parserError.type === 'entity.parse.failed') return res.status(400).json({ type: 'validation', errors: [] });

  const requestId = (res.locals['requestId'] as string | undefined) ?? newRequestId();
  const log = res.locals['log'] as Log | undefined;
  if (log) log({ level: 'error', time: new Date().toISOString(), requestId, error: error instanceof Error ? error.stack : String(error) });
  else console.error(requestId, error);
  res.status(500).json({ type: 'about:blank', title: 'Something went wrong', status: 500, requestId });
}
