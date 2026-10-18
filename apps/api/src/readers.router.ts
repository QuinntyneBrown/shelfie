import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { password, username } from './auth.router.ts';
import { requireRole } from './authz.ts';
import { Problem } from './problem.ts';
import { addReader, updateReader } from './readers.service.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const readerSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(['rose', 'sky', 'sun', 'mint', 'lilac']),
  username,
  password: password.optional(),
});

export function readersRouter(db: DatabaseSync) {
  const router = Router();
  router.use(requireSession(db), requireRole('parent'));

  const answer = (res: Parameters<Parameters<typeof router.post>[1]>[1], work: () => unknown, status = 200) => {
    try {
      res.status(status).json(work());
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  };

  router.post('/', (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = readerSchema.required({ password: true }).safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    answer(res, () => addReader(db, householdId, body.data), 201);
  });

  router.patch('/:id', (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const body = readerSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    answer(res, () => updateReader(db, householdId, String(req.params['id']), body.data));
  });

  return router;
}
