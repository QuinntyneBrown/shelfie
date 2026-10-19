import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  addCatalogueBook,
  listCatalogue,
  readOwnCatalogueCover,
  removeCatalogueBook,
  removeCatalogueCover,
  saveCatalogueCover,
  updateCatalogueBook,
} from './catalogue-books.service.ts';
import { processCover } from './covers.service.ts';
import { readImage, sendPicture } from './photos.router.ts';
import { Problem } from './problem.ts';
import { requireDirectorySession, type DirectorySession } from './session.ts';
import { validationProblem } from './validation.ts';

const bookSchema = z.object({
  title: z.string().trim().min(1).max(120),
  chapterCount: z.number().int().min(1).max(200),
  description: z.string().trim().max(300).default(''),
});

/** Answers with what `work` returns; a thrown Problem becomes its status and type. */
async function replying(res: Response, work: () => Promise<unknown>, status = 200) {
  try {
    const body = await work();
    if (body === undefined) res.status(204).end();
    else res.status(status).json(body);
  } catch (e) {
    if (!(e instanceof Problem)) throw e;
    res.status(e.status).json({ type: e.type });
  }
}

/** An author's own catalogue (L2-142 to L2-144); a volunteer is answered 403 `authors-only`. */
export function catalogueBooksRouter(db: Pool) {
  const router = Router();
  router.use(requireDirectorySession(db, ['author']));
  const authorOf = (res: Response) => (res.locals['session'] as DirectorySession).profileId;
  const idOf = (params: Record<string, unknown>) => String(params['id']);

  router.get('/', async (_req, res) => {
    res.json(await listCatalogue(db, authorOf(res)));
  });

  router.post('/', async (req, res) => {
    const body = bookSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await replying(res, () => addCatalogueBook(db, authorOf(res), body.data), 201);
  });

  router.patch('/:id', async (req, res) => {
    const body = bookSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(validationProblem(body.error));
    await replying(res, () => updateCatalogueBook(db, authorOf(res), idOf(req.params), body.data));
  });

  router.delete('/:id', async (req, res) => {
    await replying(res, () => removeCatalogueBook(db, authorOf(res), idOf(req.params)));
  });

  router.put('/:id/cover', readImage, async (req, res) => {
    await replying(res, async () => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new Problem(400, 'photo-type');
      return { coverImage: await saveCatalogueCover(db, authorOf(res), idOf(req.params), await processCover(req.body)) };
    });
  });

  router.delete('/:id/cover', async (req, res) => {
    await replying(res, () => removeCatalogueCover(db, authorOf(res), idOf(req.params)));
  });

  router.get('/:id/cover', async (req, res) => {
    sendPicture(req, res, await readOwnCatalogueCover(db, authorOf(res), idOf(req.params)));
  });

  return router;
}
