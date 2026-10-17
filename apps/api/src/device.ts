import { createHmac, timingSafeEqual } from 'node:crypto';

const sign = (householdId: string) =>
  createHmac('sha256', process.env.SHELFIE_SECRET ?? 'dev-secret').update(householdId).digest('base64url');

export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** Household named by a valid `shelfie_device` cookie, or null. */
export function deviceHousehold(cookieHeader: string | undefined): string | null {
  const value = readCookie(cookieHeader, 'shelfie_device');
  const dot = value?.lastIndexOf('.') ?? -1;
  if (!value || dot < 1) return null;
  const householdId = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(householdId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? householdId : null;
}
