import { randomUUID } from 'node:crypto';
import { UNDO_SECONDS } from './chapters.service.ts';
import { all, get, run, type Db } from './db.ts';
import type { Log } from './logging.ts';
import type { Push, PushPayload, PushTarget, Schedule } from './push.ts';

export interface Subscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Stores a browser's subscription against the signed-in profile; the same browser signing in again takes it over (L2-128). */
export async function saveSubscription(db: Db, profileId: string, { endpoint, keys }: Subscription) {
  await run(
    db,
    `INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET profile_id = EXCLUDED.profile_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [randomUUID(), profileId, endpoint, keys.p256dh, keys.auth, new Date().toISOString()],
  );
}

/** Removes the profile's own subscription for an endpoint; another profile's, or an unknown one, is left alone (L2-128). */
export async function removeSubscription(db: Db, profileId: string, endpoint: string) {
  await run(db, 'DELETE FROM push_subscription WHERE endpoint = $1 AND profile_id = $2', [endpoint, profileId]);
}

type Role = 'parent' | 'reader';
type Choice = 'chapterLogged' | 'feedback' | 'bookReward' | 'streakReward';

const COLUMN: Record<Choice, string> = {
  chapterLogged: 'notify_chapter_logged',
  feedback: 'notify_feedback',
  bookReward: 'notify_book_reward',
  streakReward: 'notify_streak_reward',
};

/** What the browser's sticker picker calls each sticker, so a message names it the way she saw it. */
const STICKER_LABELS: Record<string, string> = {
  star: 'Star 🌟',
  'wise-owl': 'Wise owl 🦉',
  rocket: 'Rocket 🚀',
  dragon: 'Dragon 🐉',
  cookie: 'Cookie 🍪',
  'bright-idea': 'Bright idea 💡',
};

/**
 * Tells every device of the household's profiles with `role`, when the household has this choice on. It never throws:
 * a notification is a courtesy, so a failure is logged (without the endpoint) and the caller carries on (L2-125 to L2-128).
 */
async function notify(db: Db, push: Push | null, log: Log, householdId: string, role: Role, choice: Choice, payload: PushPayload, onlyProfile: string | null = null) {
  if (!push) return;
  try {
    const household = await get<{ on: boolean }>(db, `SELECT ${COLUMN[choice]} AS "on" FROM household WHERE id = $1`, [householdId]);
    if (!household?.on) return;
    const targets = await all<PushTarget & { id: string; profileId: string }>(
      db,
      `SELECT s.id, s.profile_id AS "profileId", s.endpoint, s.p256dh, s.auth
         FROM push_subscription s JOIN profile p ON p.id = s.profile_id
        WHERE p.household_id = $1 AND p.role = $2 AND ($3::text IS NULL OR p.id = $3) ORDER BY s.created_at, s.id`,
      [householdId, role, onlyProfile],
    );
    for (const target of targets) {
      try {
        if ((await push.send(target, payload)) === 'gone') await run(db, 'DELETE FROM push_subscription WHERE id = $1', [target.id]);
      } catch (error) {
        log({ level: 'error', time: new Date().toISOString(), event: 'push-failed', profileId: target.profileId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } catch (error) {
    log({ level: 'error', time: new Date().toISOString(), event: 'push-failed', error: error instanceof Error ? error.message : String(error) });
  }
}

/** The four moments that send a notification, called by the routes after their own work has succeeded. */
export interface Notifier {
  /** A reader logged a chapter: after the undo window, tells the parents if it is still there and not yet reviewed. */
  chapterLogged(householdId: string, readerName: string, chapterLogId: string): void;
  feedback(householdId: string, parentName: string, chapterLogId: string, sticker: string): Promise<void>;
  bookReward(householdId: string, parentName: string, bookId: string): Promise<void>;
  /** Tells the reader who earned it; null tells every reader of the household. */
  streakReward(householdId: string, parentName: string, milestone: number, readerId: string | null): Promise<void>;
}

export function createNotifier(db: Db, push: Push | null, log: Log, schedule: Schedule): Notifier {
  const chapterOf = (chapterLogId: string) =>
    get<{ title: string; chapter: number; reviewed: boolean; readerId: string | null }>(
      db,
      `SELECT b.title, c.chapter_number AS chapter, c.reviewed_at IS NOT NULL AS reviewed, b.reader_id AS "readerId"
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1`,
      [chapterLogId],
    );
  return {
    chapterLogged(householdId, readerName, chapterLogId) {
      if (!push) return;
      schedule(async () => {
        const log_ = await chapterOf(chapterLogId).catch(() => undefined);
        if (!log_ || log_.reviewed) return;
        await notify(db, push, log, householdId, 'parent', 'chapterLogged', {
          title: `${readerName} read Chapter ${log_.chapter} of ${log_.title}`,
          body: 'Ready for your feedback.',
          url: `/review/chapters/${chapterLogId}`,
          tag: `chapter-${chapterLogId}`,
        });
      }, (UNDO_SECONDS + 1) * 1000);
    },
    async feedback(householdId, parentName, chapterLogId, sticker) {
      const chapter = await chapterOf(chapterLogId);
      if (!chapter) return;
      await notify(db, push, log, householdId, 'reader', 'feedback', {
        title: `${parentName} read Chapter ${chapter.chapter} and gave you a ${STICKER_LABELS[sticker] ?? sticker}`,
        body: 'Come and see what they said.',
        url: `/chapter-logs/${chapterLogId}`,
        tag: `feedback-${chapterLogId}`,
      }, chapter.readerId);
    },
    async bookReward(householdId, parentName, bookId) {
      const book = await get<{ title: string; readerId: string | null }>(db, 'SELECT title, reader_id AS "readerId" FROM book WHERE id = $1', [bookId]);
      if (!book) return;
      await notify(db, push, log, householdId, 'reader', 'bookReward', {
        title: `🏆 ${parentName} gave you a reward for ${book.title}`,
        body: 'Come and see what it is.',
        url: '/shelf',
        tag: `reward-${bookId}`,
      }, book.readerId);
    },
    async streakReward(householdId, parentName, milestone, readerId) {
      await notify(db, push, log, householdId, 'reader', 'streakReward', {
        title: `🔥 ${milestone} days in a row! ${parentName} gave you a reward`,
        body: 'Come and see what it is.',
        url: '/shelf',
        tag: `streak-${milestone}`,
      }, readerId);
    },
  };
}
