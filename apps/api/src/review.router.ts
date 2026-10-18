import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { Problem } from './problem.ts';
import { requireRole } from './authz.ts';
import { FEEDBACK_STICKERS, overview, sendFeedback } from './review.service.ts';
import { giveReward } from './rewards.service.ts';

const giveRewardSchema = z.object({
  text: z.string().trim().min(1).max(100),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((note) => note || null),
});

const feedbackSchema = z.object({
  sticker: z.enum(FEEDBACK_STICKERS),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((note) => note || null),
});
import { requireSession, type RequestSession } from './session.ts';

export function reviewRouter(db: DatabaseSync) {
  const router = Router();

  router.get('/review', requireSession(db), requireRole('parent'), (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(overview(db, householdId));
  });

  router.post('/chapter-logs/:id/feedback', requireSession(db), requireRole('parent'), (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = feedbackSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.json(sendFeedback(db, householdId, String(req.params['id']), body.data.sticker, body.data.note));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.post('/books/:id/reward', requireSession(db), requireRole('parent'), (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = giveRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.status(201).json(giveReward(db, householdId, String(req.params['id']), body.data.text, body.data.note));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
