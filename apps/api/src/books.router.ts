import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { requireRole } from './authz.ts';
import { createBook, deleteBook, getBook, listBooks, updateBook } from './books.service.ts';
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

const updateBookSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  author: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((author) => (author === undefined ? undefined : author || null)),
  chapterCount: z.number().int().min(1).max(200).optional(),
});

export function booksRouter(db: Pool) {
  const router = Router();

  router.post('/', requireSession(db), requireRole('reader'), async (req, res) => {
    const { householdId, role } = res.locals['session'] as RequestSession;
    const body = createBookSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    res.status(201).json(await createBook(db, householdId, role, body.data));
  });

  router.get('/', requireSession(db), requireRole('parent'), async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(await listBooks(db, householdId));
  });

  router.get('/:id', requireSession(db), requireRole('reader'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      res.json(await getBook(db, householdId, String(req.params['id'])));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.patch('/:id', requireSession(db), requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = updateBookSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.json(await updateBook(db, householdId, String(req.params['id']), body.data));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  router.delete('/:id', requireSession(db), requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      await deleteBook(db, householdId, String(req.params['id']));
      res.status(204).end();
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
