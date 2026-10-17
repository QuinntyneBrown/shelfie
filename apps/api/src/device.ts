import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const sign = (deviceId: string) =>
  createHmac('sha256', process.env.SHELFIE_DEVICE_KEY ?? 'dev-device-key').update(deviceId).digest('base64url');

export const DEVICE_COOKIE = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** Device id from a `shelfie_device` cookie whose signature checks out, or null. */
export function readDeviceId(cookieHeader: string | undefined): string | null {
  const value = readCookie(cookieHeader, 'shelfie_device');
  const dot = value?.lastIndexOf('.') ?? -1;
  if (!value || dot < 1) return null;
  const deviceId = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(deviceId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? deviceId : null;
}

/** Household a validly signed device belongs to, or null. */
export function deviceHousehold(db: DatabaseSync, cookieHeader: string | undefined): string | null {
  const deviceId = readDeviceId(cookieHeader);
  if (!deviceId) return null;
  const row = db.prepare('SELECT household_id FROM device WHERE id = ?').get(deviceId) as { household_id: string } | undefined;
  return row?.household_id ?? null;
}

/** Remembers this browser for the household; returns the signed cookie value when a new device was made. */
export function rememberDevice(db: DatabaseSync, householdId: string, cookieHeader: string | undefined): string | null {
  if (deviceHousehold(db, cookieHeader) === householdId) return null;
  const id = randomUUID();
  db.prepare('INSERT INTO device (id, household_id, created_at) VALUES (?, ?, ?)').run(id, householdId, new Date().toISOString());
  return `${id}.${sign(id)}`;
}
