import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { addQuestion } from './questions.service.ts';
import { requireSession, type RequestSession } from './session.ts';

const questionSchema = z.object({ text: z.string().trim().min(5).max(200) });

function replying(res: Response, run: () => unknown, status = 200) {
  try {
    const body = run();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type });
  }
}

export function questionsRouter(db: DatabaseSync) {
  const router = Router();
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.post('/books/:id/questions', requireSession(db), requireRole('grown_up'), (req, res) => {
    const body = questionSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ type: 'validation' });
    replying(res, () => addQuestion(db, householdOf(res), String(req.params['id']), body.data.text), 201);
  });

  return router;
}
