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

/** The URL every avatar loads; the version changes with each new photo. */
export function photoUrl(profileId: string, etag: string) {
  return `/api/photos/${profileId}?v=${etag}`;
}

/**
 * Decodes an upload and re-encodes it as a centre-cropped 256 × 256 WebP. The result carries no
 * EXIF, GPS, XMP or ICC data, because sharp writes none unless asked. Anything that is not a JPEG,
 * PNG or WebP, or is over 40 megapixels, is refused as `photo-type`.
 */
export async function processPhoto(bytes: Buffer): Promise<Buffer> {
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS });
    const { format } = await image.metadata();
    if (!format || !FORMATS.has(format)) throw new Problem(400, 'photo-type');
    return await image.rotate().resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
  } catch (e) {
    if (e instanceof Problem) throw e;
    throw new Problem(400, 'photo-type');
  }
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

/** The photo of a person in the household; another household's photo reads as absent. */
export function readPhoto(db: Db, householdId: string, profileId: string): Promise<ProfilePhoto | undefined> {
  return get<ProfilePhoto>(
    db,
    'SELECT pp.image, pp.etag FROM profile_photo pp JOIN profile p ON p.id = pp.profile_id WHERE pp.profile_id = $1 AND p.household_id = $2',
    [profileId, householdId],
  );
}
