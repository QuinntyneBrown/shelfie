import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { sendFeedback } from './feedback.service.ts';
import { feedbackLimiter } from './rate-limit.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const feedbackSchema = z.object({
  kind: z.enum(['feel', 'idea']),
  score: z.number().int().min(1).max(5).nullable().optional(),
  message: z.string().trim().max(1000).optional(),
}).refine((f) => f.score != null || !!f.message, { path: ['message'], message: 'Give a score or a message.' });

/** Feedback from anyone signed in, about how Shelfie feels or an idea (L2-115). */
export function feedbackRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));

  router.post('/', feedbackLimiter(db), async (req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    const body = feedbackSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    const { kind, score = null, message } = body.data;
    res.status(201).json(await sendFeedback(db, householdId, profileId, { kind, score, message: message || null }));
  });

  return router;
}
