import { Router, type Request, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { adminAudit } from './admin-audit.ts';
import { adminGuard, refuse } from './admin-auth.ts';
import { correctLog, deleteLog, finishBook, getLog, householdOfBook, listBooks, listLogs, listUsers, resetParentPassword } from './admin.service.ts';
import { listFeedback } from './feedback.service.ts';
import { Problem } from './problem.ts';
import { giveRewardSchema } from './review.router.ts';
import { giveReward } from './rewards.service.ts';
import { validationProblem } from './validation.ts';

const params = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/) });
const correctLogSchema = z.object({ readOn: z.iso.date() });
const passwordSchema = z.object({ password: z.string().min(8).max(200) });

/** Answers with what `run` returns; a thrown Problem becomes a problem document. */
async function answer(res: Response, run: () => Promise<unknown>, status = 200) {
  try {
    res.status(status).json(await run());
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    refuse(res, e.status, e.type, e.extra);
  }
}

/** Runs a write in one transaction, rolled back when it throws or when this is a dry run (L2-062). */
async function transaction<T>(pool: Pool, dryRun: boolean, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** The request body, or undefined after answering 400. */
function bodyOf<T>(schema: z.ZodType<T>, req: Request, res: Response): T | undefined {
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) return void refuse(res, 400, 'validation', { errors: validationProblem(parsed.error).errors });
  return parsed.data;
}

/** The path id, or undefined after answering 400. */
function idOf(req: Request, res: Response): string | undefined {
  const parsed = params.safeParse(req.params);
  if (!parsed.success) return void refuse(res, 400, 'validation', { errors: validationProblem(parsed.error).errors });
  return parsed.data.id;
}

/** The operator's API under /api/admin/v1 (apps/api/admin-api.yaml). */
export function adminRouter(db: Pool) {
  const router = Router();
  const guard = adminGuard(db);
  router.use(adminAudit(db));

  router.get('/whoami', ...guard('read'), (_req, res) => {
    res.json(res.locals['adminToken']);
  });

  router.get('/users', ...guard('read'), (_req, res) => answer(res, () => listUsers(db)));
  router.get('/books', ...guard('read'), (_req, res) => answer(res, () => listBooks(db)));
  router.get('/feedback', ...guard('read'), (_req, res) => answer(res, () => listFeedback(db)));

  router.get('/books/:id/logs', ...guard('read'), async (req, res) => {
    const id = idOf(req, res);
    if (id) await answer(res, () => listLogs(db, id));
  });

  router.get('/logs/:id', ...guard('read'), async (req, res) => {
    const id = idOf(req, res);
    if (id) await answer(res, () => getLog(db, id));
  });

  /** Answers a write with its result and whether it was a dry run. */
  const write = (req: Request, res: Response, run: (client: PoolClient) => Promise<object>, status = 200) => {
    const dryRun = req.query['dryRun'] === 'true';
    return answer(res, async () => ({ ...(await transaction(db, dryRun, run)), dryRun }), status);
  };

  router.post('/books/:id/finish', ...guard('write'), async (req, res) => {
    const id = idOf(req, res);
    if (id) await write(req, res, (tx) => finishBook(tx, id));
  });

  router.post('/books/:id/reward', ...guard('write'), async (req, res) => {
    const id = idOf(req, res);
    const body = id && bodyOf(giveRewardSchema, req, res);
    if (id && body) await write(req, res, async (tx) => giveReward(tx, await householdOfBook(tx, id), id, body.text, body.note), 201);
  });

  router.patch('/logs/:id', ...guard('write'), async (req, res) => {
    const id = idOf(req, res);
    const body = id && bodyOf(correctLogSchema, req, res);
    if (id && body) await write(req, res, (tx) => correctLog(tx, id, body.readOn));
  });

  router.delete('/logs/:id', ...guard('write'), async (req, res) => {
    const id = idOf(req, res);
    if (id) await write(req, res, (tx) => deleteLog(tx, id));
  });

  router.put('/users/:id/password', ...guard('write'), async (req, res) => {
    const id = idOf(req, res);
    const body = id && bodyOf(passwordSchema, req, res);
    if (id && body) await write(req, res, (tx) => resetParentPassword(tx, id, body.password));
  });

  router.use((_req, res) => refuse(res, 404, 'not-found'));
  return router;
}
