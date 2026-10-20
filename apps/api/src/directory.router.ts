import { Router, type Response } from 'express';
import type { Pool } from 'pg';
import { requireRole } from './authz.ts';
import { getAuthor, getCatalogueBook, getVolunteer, listDirectory, readCatalogueCover, readDirectoryPhoto } from './directory.service.ts';
import { sendPicture } from './photos.router.ts';
import { requireSession } from './session.ts';

/** Parents browse approved authors and volunteers (L2-169 to L2-174). A reader gets 403 grown-ups-only; an author or volunteer 403 household-only. */
export function directoryRouter(db: Pool) {
  const router = Router();
  router.use(requireSession(db), requireRole('parent'));

  router.get('/', async (_req, res) => {
    res.json(await listDirectory(db));
  });

  /** Answers 404 not-found for anything that is not listed, whatever the reason (L2-170). */
  const found = (res: Response, body: unknown) => (body ? res.json(body) : res.status(404).json({ type: 'not-found' }));

  router.get('/authors/:id', async (req, res) => {
    found(res, await getAuthor(db, String(req.params['id'])));
  });

  router.get('/volunteers/:id', async (req, res) => {
    found(res, await getVolunteer(db, String(req.params['id'])));
  });

  router.get('/books/:id', async (req, res) => {
    found(res, await getCatalogueBook(db, String(req.params['id'])));
  });

  router.get('/books/:id/cover', async (req, res) => {
    sendPicture(req, res, await readCatalogueCover(db, String(req.params['id'])));
  });

  router.get('/photos/:profileId', async (req, res) => {
    sendPicture(req, res, await readDirectoryPhoto(db, String(req.params['profileId'])));
  });

  return router;
}
