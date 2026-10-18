import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { authRouter } from './auth.router.ts';
import { csrfGuard } from './csrf.ts';
import { problemDetailsHandler } from './errors.ts';
import { requestLogging, stdoutLog, type Log } from './logging.ts';
import type { Mail } from './mail.ts';
import { booksRouter } from './books.router.ts';
import { chapterLogsRouter, chaptersRouter } from './chapters.router.ts';
import { questionsRouter } from './questions.router.ts';
import { invitesRouter } from './invites.router.ts';
import { readersRouter } from './readers.router.ts';
import { reviewRouter } from './review.router.ts';
import { settingsRouter } from './settings.router.ts';
import { shelfRouter } from './shelf.router.ts';

export function createApp(db: DatabaseSync, options: { log?: Log; mail?: Mail } = {}) {
  const app = express();
  app.use(requestLogging(options.log ?? stdoutLog));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    next();
  });
  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api', csrfGuard);
  app.use('/api/auth', authRouter(db, options.mail));
  app.use('/api/shelf', shelfRouter(db));
  app.use('/api', questionsRouter(db));
  app.use('/api', reviewRouter(db));
  app.use('/api/books', booksRouter(db));
  app.use('/api/books', chaptersRouter(db));
  app.use('/api/settings', settingsRouter(db));
  app.use('/api/readers', readersRouter(db));
  app.use('/api/invites', invitesRouter(db, options.mail));
  app.use('/api/chapter-logs', chapterLogsRouter(db));
  app.use(problemDetailsHandler);
  return app;
}
