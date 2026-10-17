import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { createBook, getBook } from './books.service.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';

export const COVER_COLORS = ['sage', 'rose', 'sky', 'sun', 'lilac', 'mint', 'peach'] as const;
export const STICKERS = ['🦁', '🤖', '🐕', '📚', '🕷️', '🐇', '🧙', '🚀', '🐉', '🌳', '🐘', '🍫'] as const;

const createBookSchema = z.object({
  title: z.string().trim().min(1).max(120),
  author: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((author) => author || null),
  chapterCount: z.number().int().min(1).max(200),
  coverColor: z.enum(COVER_COLORS),
  sticker: z.enum(STICKERS),
});

export function booksRouter(db: DatabaseSync) {
  const router = Router();

  router.post('/', requireSession(db), requireRole('reader'), (req, res) => {
    const { householdId, role } = res.locals['session'] as RequestSession;
    const body = createBookSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });
    res.status(201).json(createBook(db, householdId, role, body.data));
  });

  router.get('/:id', requireSession(db), requireRole('reader'), (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      res.json(getBook(db, householdId, String(req.params['id'])));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
