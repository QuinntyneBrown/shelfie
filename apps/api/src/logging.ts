import { randomInt } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type Log = (line: Record<string, unknown>) => void;

/** One JSON line per event on stdout. */
export const stdoutLog: Log = (line) => process.stdout.write(`${JSON.stringify(line)}\n`);

export const newRequestId = () => `SHF-${randomInt(0x10000).toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Gives each request an id (sent back as X-Request-Id) and logs one line when it finishes: id, method,
 * route pattern, status and duration. Bodies, headers and URLs are never logged, so passwords, PINs,
 * tokens, answers and the ids in paths stay out of the log.
 */
export function requestLogging(log: Log) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = newRequestId();
    const startedAt = performance.now();
    let route = 'unmatched';
    res.locals['requestId'] = requestId;
    res.locals['log'] = log;
    res.set('X-Request-Id', requestId);

    // Express knows the matched route only while the handler runs, so note it as the response is sent.
    const end = res.end.bind(res) as (...args: unknown[]) => Response;
    res.end = ((...args: unknown[]) => {
      if (req.route) route = `${req.baseUrl}${req.route.path}`;
      return end(...args);
    }) as Response['end'];

    res.on('finish', () => {
      log({
        level: 'info',
        time: new Date().toISOString(),
        requestId,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
    next();
  };
}
