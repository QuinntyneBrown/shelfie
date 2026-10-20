import { get, run, transaction } from './db.ts';
import type { Pool } from 'pg';
import { ownPhotoUrl } from './photos.service.ts';
import type { DirectorySession } from './session.ts';

/** What an author or volunteer shows parents, and whether the operator has listed it (ADR-0022). */
export interface MyProfile {
  role: DirectorySession['role'];
  name: string;
  status: 'pending' | 'approved' | 'hidden';
  bio: string;
  website: string | null;
  ages: string | null;
  contact: string | null;
  photo: string | null;
}

export interface MyProfileInput {
  name: string;
  bio: string;
  /** An author's only. */
  website?: string | null;
  /** A volunteer's only. */
  ages?: string;
  contact?: string;
}

export async function getMyProfile(db: Pool, profileId: string): Promise<MyProfile> {
  const row = (await get<Omit<MyProfile, 'photo'> & { etag: string | null }>(
    db,
    `SELECT p.role, p.name, d.status, d.bio, d.website, d.ages, d.contact, pp.etag
       FROM profile p JOIN directory_profile d ON d.profile_id = p.id LEFT JOIN profile_photo pp ON pp.profile_id = p.id WHERE p.id = $1`,
    [profileId],
  ))!;
  const { etag, ...profile } = row;
  return { ...profile, photo: etag ? ownPhotoUrl(row.role, profileId, etag) : null };
}

/** Saves the session's own profile; the listing status is left as it is, so an approved profile stays listed (ADR-0022). */
export async function updateMyProfile(pool: Pool, session: DirectorySession, input: MyProfileInput): Promise<MyProfile> {
  const author = session.role === 'author';
  await transaction(pool, async (db) => {
    await run(db, 'UPDATE profile SET name = $1 WHERE id = $2', [input.name, session.profileId]);
    await run(db, 'UPDATE directory_profile SET bio = $1, website = $2, ages = $3, contact = $4, updated_at = $5 WHERE profile_id = $6', [
      input.bio,
      author ? (input.website ?? null) : null,
      author ? null : input.ages,
      author ? null : input.contact,
      new Date().toISOString(),
      session.profileId,
    ]);
  });
  return getMyProfile(pool, session.profileId);
}
