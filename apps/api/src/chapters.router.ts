import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { validationProblem } from './validation.ts';
import { getChapter, getForm, logChapter, markFeedbackSeen, undoLog } from './chapters.service.ts';
import { Problem } from './problem.ts';
import type { Notifier } from './push.service.ts';
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

async function replying(res: Response, run: () => Promise<unknown>, status = 200) {
  try {
    const body = await run();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type, ...e.extra });
  }
}

export function chapterLogsRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db));
  router.get('/:id', async (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    await replying(res, () => getChapter(db, householdId, String(req.params['id'])));
  });

  router.post('/:id/seen', async (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    await replying(res, () => markFeedbackSeen(db, householdId, String(req.params['id'])));
  });

  router.delete('/:id', async (req, res) => {
    const householdId = (res.locals['session'] as RequestSession).householdId;
    await replying(res, () => undoLog(db, householdId, String(req.params['id'])));
  });
  return router;
}

export function chaptersRouter(db: Pool, notifier: Notifier) {
  const router = Router();
  router.use(requireSession(db));

  const householdOf = (res: Response) => (res.locals['session'] as RequestSession).householdId;

  router.get('/:id/chapters/:n/form', async (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    await replying(res, () => getForm(db, householdOf(res), p.data.id, p.data.n));
  });

  router.post('/:id/chapters/:n', async (req, res) => {
    const p = params.safeParse(req.params);
    if (!p.success) return res.status(404).json({ type: 'not-found' });
    const body = logChapterSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json(validationProblem(body.error));
    }
    await replying(
      res,
      async () => {
        const logged = await logChapter(db, householdOf(res), p.data.id, p.data.n, body.data);
        notifier.chapterLogged(householdOf(res), (res.locals['session'] as RequestSession).name, logged.chapterLogId);
        return logged;
      },
      201,
    );
  });

  return router;
}
