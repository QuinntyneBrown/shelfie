import express from 'express';
import type { DatabaseSync } from 'node:sqlite';

export function createApp(db: DatabaseSync) {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });
  return app;
}
