import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { Problem } from './problem.ts';
import { requireRole } from './authz.ts';
import { FEEDBACK_STICKERS, overview, sendFeedback } from './review.service.ts';
import { giveReward } from './rewards.service.ts';
import { getChapter } from './chapters.service.ts';
import { askAssistant, type ReviewAssistant } from './review-assistant.ts';
import { assistLimiter } from './rate-limit.ts';

export const giveRewardSchema = z.object({
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

export function reviewRouter(db: Pool, assistant: ReviewAssistant) {
  const router = Router();

  router.get('/review', requireSession(db), requireRole('parent'), async (_req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    res.json(await overview(db, householdId));
  });

  router.post('/chapter-logs/:id/feedback', requireSession(db), requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = feedbackSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.json(await sendFeedback(db, householdId, String(req.params['id']), body.data.sticker, body.data.note));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  // Asked for by the parent only; the advice is returned and never stored (L2-049, L2-053).
  router.post('/chapter-logs/:id/assist', requireSession(db), requireRole('parent'), assistLimiter(db), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    try {
      const chapter = await getChapter(db, householdId, String(req.params['id']));
      if (chapter.review) throw new Problem(409, 'already-reviewed');
      res.json(
        await askAssistant(assistant, {
          bookTitle: chapter.book.title,
          chapterNumber: chapter.chapterNumber,
          answers: chapter.answers.map((a) => ({ position: a.position, question: a.questionText, answer: a.text })),
        }),
      );
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  router.post('/books/:id/reward', requireSession(db), requireRole('parent'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = giveRewardSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.status(201).json(await giveReward(db, householdId, String(req.params['id']), body.data.text, body.data.note));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
