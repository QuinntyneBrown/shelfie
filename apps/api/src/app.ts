import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { authRouter } from './auth.router.ts';
import { problemDetailsHandler } from './errors.ts';
import { chapterLogsRouter, chaptersRouter } from './chapters.router.ts';
import { settingsRouter } from './settings.router.ts';
import { shelfRouter } from './shelf.router.ts';

export function createApp(db: DatabaseSync) {
  const app = express();
  app.use(express.json());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(db));
  app.use('/api/shelf', shelfRouter(db));
  app.use('/api/books', chaptersRouter(db));
  app.use('/api/settings', settingsRouter(db));
  app.use('/api/chapter-logs', chapterLogsRouter(db));
  app.use(problemDetailsHandler);
  return app;
}
