import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireRole } from './authz.ts';
import { createInvite } from './invites.service.ts';
import type { Mail } from './mail.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';
import { validationProblem } from './validation.ts';

const inviteSchema = z.object({ email: z.email() });

export function invitesRouter(db: Pool, mail?: Mail) {
  const router = Router();
  router.use(requireSession(db), requireRole('parent'));

  router.post('/', async (req, res) => {
    const { householdId, profileId } = res.locals['session'] as RequestSession;
    const body = inviteSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    try {
      res.status(201).json(await createInvite(db, householdId, profileId, body.data.email, mail));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type, ...e.extra });
    }
  });

  return router;
}
