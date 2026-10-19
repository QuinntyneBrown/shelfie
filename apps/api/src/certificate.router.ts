import { Router } from 'express';
import type { Pool } from 'pg';
import { requireRole } from './authz.ts';
import { getBook } from './books.service.ts';
import { certificateFileName, renderCertificate } from './certificate.service.ts';
import { Problem } from './problem.ts';
import { requireSession, type RequestSession } from './session.ts';

export function certificateRouter(db: Pool) {
  const router = Router();

  // Same access as GET /books/:id: the reader and her parents can all print it (L2-114).
  router.get('/:id/certificate.pdf', requireSession(db), requireRole('reader'), async (req, res) => {
    const { householdId } = res.locals['session'] as RequestSession;
    const bookId = String(req.params['id']);
    try {
      const pdf = await renderCertificate(db, householdId, bookId);
      const { readerName, title } = await getBook(db, householdId, bookId);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${certificateFileName(readerName, title)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(pdf);
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      res.status(e.status).json({ type: e.type });
    }
  });

  return router;
}
