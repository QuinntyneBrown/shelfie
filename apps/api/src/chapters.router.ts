import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { Problem, getForm, logChapter } from './chapters.service.ts';
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

export function chaptersRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db));

  const reply = (res: Response, run: () => unknown, status = 200) => {
    try {
      res.status(status).json(run());
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  };
  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/:id/chapters/:n/form', (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    reply(res, () => getForm(db, householdOf(res), p.data.id, p.data.n));
  });

  router.post('/:id/chapters/:n', (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    const body = logChapterSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ type: 'validation', errors: body.error.issues.map((i) => ({ path: ['answers', ...i.path].join('.'), message: i.message })) });
    }
    reply(res, () => logChapter(db, householdOf(res), p.data.id, p.data.n, body.data), 201);
  });

  return router;
}
