import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { addQuestion, removeQuestion, updateQuestion } from './questions.service.ts';
import { requireSession, type RequestSession } from './session.ts';

const questionSchema = z.object({ text: z.string().trim().min(5).max(200) });

async function replying(res: Response, run: () => Promise<unknown>, status = 200) {
  try {
    const body = await run();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type });
  }
}

export function questionsRouter(db: Pool) {
  const router = Router();
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.post('/books/:id/questions', requireSession(db), requireRole('parent'), async (req, res) => {
    const body = questionSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await replying(res, () => addQuestion(db, householdOf(res), String(req.params['id']), body.data.text), 201);
  });

  router.patch('/questions/:id', requireSession(db), requireRole('parent'), async (req, res) => {
    const body = questionSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await replying(res, () => updateQuestion(db, householdOf(res), String(req.params['id']), body.data.text));
  });

  router.delete('/questions/:id', requireSession(db), requireRole('parent'), async (req, res) => {
    await replying(res, () => removeQuestion(db, householdOf(res), String(req.params['id'])));
  });

  return router;
}
