import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { getChapter, getForm, logChapter, markFeedbackSeen, undoLog } from './chapters.service.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';

const params = z.object({ id: z.string(), n: z.coerce.number().int().min(1) });
const logChapterSchema = z.object({
  readOn: z.iso.date(),
  answers: z
    .array(z.object({ position: z.number().int(), text: z.string().max(2000) }))
    .refine((answers) => answers.some((a) => a.position === 1 && a.text.trim() !== ''), {
      path: ['0', 'text'],
      message: 'Question 1 needs an answer',
    }),
});

function replying(res: Response, run: () => unknown, status = 200) {
  try {
    const body = run();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}

export function chapterLogsRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db));
  router.get('/:id', (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    replying(res, () => getChapter(db, householdId, String(req.params['id'])));
  });

  router.post('/:id/seen', (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    replying(res, () => markFeedbackSeen(db, householdId, String(req.params['id'])));
  });

  router.delete('/:id', (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    replying(res, () => undoLog(db, householdId, String(req.params['id'])));
  });
  return router;
}

export function chaptersRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db));

  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/:id/chapters/:n/form', (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    replying(res, () => getForm(db, householdOf(res), p.data.id, p.data.n));
  });

  router.post('/:id/chapters/:n', (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    const body = logChapterSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json(validationProblem(body.error));
    }
    replying(res, () => logChapter(db, householdOf(res), p.data.id, p.data.n, body.data), 201);
  });

  return router;
}
