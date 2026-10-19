import type { Pool } from 'pg';
import { all, get, run, transaction, type Db } from './db.ts';
import { PHOTO_COLUMN } from './photos.service.ts';
import { Problem } from './problem.ts';
import { hashSecret, verifySecret } from './secret.ts';

export interface ParentView {
  id: string;
  name: string;
  username: string;
  color: string;
  photo: string | null;
}

export interface InviteView {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
}

export interface ReaderView {
  id: string;
  name: string;
  color: string;
  username: string;
  photo: string | null;
}

/** Which events send a push notification, for the whole household (L2-123). */
export interface NotificationChoices {
  chapterLogged: boolean;
  feedback: boolean;
  bookReward: boolean;
  streakReward: boolean;
}

export interface SettingsView {
  account: { name: string; username: string; email: string };
  theme: string;
  notifications: NotificationChoices;
  parents: ParentView[];
  invites: InviteView[];
  readers: ReaderView[];
}

export function listReaders(db: Db, householdId: string): Promise<ReaderView[]> {
  return all<ReaderView>(
    db,
    `SELECT p.id, p.name, p.color, p.username, ${PHOTO_COLUMN}
       FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id WHERE p.household_id = $1 AND p.role = 'reader' ORDER BY p.name`,
    [householdId],
  );
}

export function listPendingInvites(db: Db, householdId: string): Promise<InviteView[]> {
  return all<InviteView>(
    db,
    `SELECT token_hash AS id, email,
            to_char((expires_at::timestamptz - interval '7 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "sentAt",
            expires_at AS "expiresAt"
       FROM invites WHERE household_id = $1 AND used_at IS NULL AND expires_at > $2 ORDER BY expires_at`,
    [householdId, new Date().toISOString()],
  );
}

export async function getSettings(db: Db, householdId: string, profileId: string): Promise<SettingsView> {
  const account = (await get<SettingsView['account']>(db, 'SELECT name, username, email FROM profile WHERE id = $1', [profileId]))!;
  const { theme, ...notifications } = (await get<{ theme: string } & NotificationChoices>(
    db,
    `SELECT theme, notify_chapter_logged AS "chapterLogged", notify_feedback AS "feedback", notify_book_reward AS "bookReward", notify_streak_reward AS "streakReward"
       FROM household WHERE id = $1`,
    [householdId],
  ))!;
  const parents = await all<ParentView>(
    db,
    `SELECT p.id, p.name, p.username, p.color, ${PHOTO_COLUMN}
       FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id WHERE p.household_id = $1 AND p.role = 'parent' ORDER BY (p.id = $2) DESC, p.name`,
    [householdId, profileId],
  );
  return { account, theme, notifications, parents, invites: await listPendingInvites(db, householdId), readers: await listReaders(db, householdId) };
}

export interface SettingsPatch {
  theme: string;
  notifications?: NotificationChoices;
  account: { name: string; email: string; newPassword?: string; currentPassword?: string };
}

export async function updateSettings(pool: Pool, householdId: string, profileId: string, patch: SettingsPatch): Promise<SettingsView> {
  const stored = (await get<{ email: string; password_hash: string }>(pool, 'SELECT email, password_hash FROM profile WHERE id = $1', [profileId]))!;
  const email = patch.account.email.trim().toLowerCase();
  const changingEmail = email !== stored.email;
  if (changingEmail || patch.account.newPassword) {
    if (!patch.account.currentPassword || !verifySecret(patch.account.currentPassword, stored.password_hash)) {
      throw new Problem(400, 'current-password-invalid');
    }
  }
  if (changingEmail && (await get(pool, 'SELECT 1 FROM profile WHERE email = $1 AND id != $2', [email, profileId]))) {
    throw new Problem(409, 'email-in-use');
  }
  await transaction(pool, async (db) => {
    await run(db, 'UPDATE profile SET name = $1, email = $2 WHERE id = $3', [patch.account.name, email, profileId]);
    if (patch.account.newPassword) {
      await run(db, 'UPDATE profile SET password_hash = $1 WHERE id = $2', [hashSecret(patch.account.newPassword), profileId]);
    }
    await run(db, 'UPDATE household SET theme = $1 WHERE id = $2', [patch.theme, householdId]);
    if (patch.notifications) {
      const n = patch.notifications;
      await run(db, 'UPDATE household SET notify_chapter_logged = $1, notify_feedback = $2, notify_book_reward = $3, notify_streak_reward = $4 WHERE id = $5', [
        n.chapterLogged,
        n.feedback,
        n.bookReward,
        n.streakReward,
        householdId,
      ]);
    }
  });
  return getSettings(pool, householdId, profileId);
}
