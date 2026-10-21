import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';

/** Stored photos are this many pixels square. */
const SIZE = 256;
const FORMATS = new Set(['jpeg', 'png', 'webp']);
// A decompression bomb is refused before it is decoded in full.
const MAX_PIXELS = 40_000_000;

export interface ProfilePhoto {
  image: Buffer;
  etag: string;
}

/** The photo URL as a column, for queries over `profile p LEFT JOIN profile_photo pp`; null without a photo. */
export const PHOTO_COLUMN = "CASE WHEN pp.etag IS NULL THEN NULL ELSE '/api/photos/' || p.id || '?v=' || pp.etag END AS photo";

/** The URL every avatar loads; the version changes with each new photo. */
export function photoUrl(profileId: string, etag: string) {
  return `/api/photos/${profileId}?v=${etag}`;
}

/** The URL a person loads their own photo from: inside the household, or `/api/me/photo` for an author or volunteer (ADR-0021). */
export function ownPhotoUrl(role: string, profileId: string, etag: string) {
  return role === 'author' || role === 'volunteer' ? `/api/me/photo?v=${etag}` : photoUrl(profileId, etag);
}

/**
 * Decodes an upload and re-encodes it as a centre-cropped WebP of the given size. The result carries
 * no EXIF, GPS, XMP or ICC data, because sharp writes none unless asked. Anything that is not a JPEG,
 * PNG or WebP, or is over 40 megapixels, is refused as `photo-type`.
 */
export async function processImage(bytes: Buffer, width: number, height: number): Promise<Buffer> {
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS });
    const { format } = await image.metadata();
    if (!format || !FORMATS.has(format)) throw new Problem(400, 'photo-type');
    return await image.rotate().resize(width, height, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
  } catch (e) {
    if (e instanceof Problem) throw e;
    throw new Problem(400, 'photo-type');
  }
}

/** A profile photo: centre-cropped to 256 × 256. */
export function processPhoto(bytes: Buffer): Promise<Buffer> {
  return processImage(bytes, SIZE, SIZE);
}

/** Stores the profile's photo in place of any earlier one and returns its URL. */
export async function savePhoto(db: Db, profileId: string, image: Buffer): Promise<string> {
  const etag = createHash('sha256').update(image).digest('hex').slice(0, 16);
  await run(
    db,
    `INSERT INTO profile_photo (profile_id, image, etag, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (profile_id) DO UPDATE SET image = EXCLUDED.image, etag = EXCLUDED.etag, updated_at = EXCLUDED.updated_at`,
    [profileId, image, etag, new Date().toISOString()],
  );
  return photoUrl(profileId, etag);
}

export async function removePhoto(db: Db, profileId: string): Promise<void> {
  await run(db, 'DELETE FROM profile_photo WHERE profile_id = $1', [profileId]);
}

/** A person's own photo, read by its owner. */
export function readOwnPhoto(db: Db, profileId: string): Promise<ProfilePhoto | undefined> {
  return get<ProfilePhoto>(db, 'SELECT image, etag FROM profile_photo WHERE profile_id = $1', [profileId]);
}

/** The photo of a person in the household; another household's photo reads as absent. */
export function readPhoto(db: Db, householdId: string, profileId: string): Promise<ProfilePhoto | undefined> {
  return get<ProfilePhoto>(
    db,
    'SELECT pp.image, pp.etag FROM profile_photo pp JOIN profile p ON p.id = pp.profile_id WHERE pp.profile_id = $1 AND p.household_id = $2',
    [profileId, householdId],
  );
}
