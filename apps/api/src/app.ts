import express from 'express';
import type { Pool } from 'pg';
import { adminRouter } from './admin.router.ts';
import { authRouter } from './auth.router.ts';
import { csrfGuard } from './csrf.ts';
import { problemDetailsHandler } from './errors.ts';
import { requestLogging, stdoutLog, type Log } from './logging.ts';
import type { Mail } from './mail.ts';
import { booksRouter } from './books.router.ts';
import { bookSearchRouter } from './book-search.router.ts';
import type { Provider, WorkCoversProvider } from './book-search.service.ts';
import { configuredAi } from './ai.ts';
import { openLibrary, openLibraryWorkCovers } from './catalogue.ts';
import { chapterLogsRouter, chaptersRouter } from './chapters.router.ts';
import { catalogueBooksRouter } from './catalogue-books.router.ts';
import { certificateRouter } from './certificate.router.ts';
import { coversRouter } from './covers.router.ts';
import { galleryRouter } from './gallery.router.ts';
import { streakRewardsRouter } from './streak-rewards.router.ts';
import { feedbackRouter } from './feedback.router.ts';
import { createPush, inProcess, type Push, type Schedule } from './push.ts';
import { createNotifier } from './push.service.ts';
import { pushRouter } from './push.router.ts';
import { questionsRouter } from './questions.router.ts';
import { invitesRouter } from './invites.router.ts';
import { meRouter } from './me.router.ts';
import { readersRouter } from './readers.router.ts';
import { reviewRouter } from './review.router.ts';
import { anthropicAssistant, type ReviewAssistant } from './review-assistant.ts';
import { photosRouter } from './photos.router.ts';
import { settingsRouter } from './settings.router.ts';
import { shelfRouter } from './shelf.router.ts';
import type { SuggestQuestions } from './suggestions.ts';

export function createApp(db: Pool, options: { log?: Log; mail?: Mail; assistant?: ReviewAssistant; suggest?: SuggestQuestions; catalogue?: Provider; ai?: Provider | null; coverFetch?: typeof fetch; workCovers?: WorkCoversProvider; push?: Push | null; schedule?: Schedule } = {}) {
  const app = express();
  const log = options.log ?? stdoutLog;
  // Push needs VAPID keys; with none set it is off, and tests pass a fake (ADR-0016).
  const push = options.push === undefined ? createPush() : options.push;
  const notifier = createNotifier(db, push, log, options.schedule ?? inProcess);
  app.use(requestLogging(log));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    next();
  });
  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  // Bearer-token only, no cookies: browsers never send the credential on their own, so no CSRF guard (ADR-0005).
  app.use('/api/admin/v1', adminRouter(db));
  app.use('/api', csrfGuard);
  app.use('/api/auth', authRouter(db, options.mail));
  app.use('/api/shelf', shelfRouter(db));
  app.use('/api', questionsRouter(db, options.suggest));
  app.use('/api', reviewRouter(db, options.assistant ?? anthropicAssistant, notifier));
  // The lookup's providers: Open Library and, with ANTHROPIC_API_KEY set, Claude; tests pass fakes.
  app.use('/api/books', bookSearchRouter(db, { catalogue: options.catalogue ?? openLibrary(), ai: options.ai === undefined ? configuredAi() : options.ai, workCovers: options.workCovers ?? openLibraryWorkCovers(), coverFetch: options.coverFetch }));
  app.use('/api/books', booksRouter(db));
  app.use('/api/books', chaptersRouter(db, notifier));
  app.use('/api/books', coversRouter(db));
  app.use('/api/books', certificateRouter(db));
  app.use('/api/settings', settingsRouter(db));
  app.use('/api/readers', readersRouter(db));
  app.use('/api/gallery-rewards', galleryRouter(db));
  app.use('/api/streak-rewards', streakRewardsRouter(db, notifier));
  app.use('/api/feedback', feedbackRouter(db));
  app.use('/api/push', pushRouter(db, push));
  app.use('/api/invites', invitesRouter(db, options.mail));
  app.use('/api/chapter-logs', chapterLogsRouter(db));
  app.use('/api/me', meRouter(db));
  app.use('/api/catalogue-books', catalogueBooksRouter(db));
  app.use('/api', photosRouter(db));
  app.use(problemDetailsHandler);
  return app;
}
