import { createHmac } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';

// Stands in for password sign-in (not built yet), which is what sets this cookie in real use.
export async function giveDeviceCookie(context: BrowserContext, householdId = 'h1') {
  const secret = process.env.SHELFIE_SECRET ?? 'dev-secret';
  const sig = createHmac('sha256', secret).update(householdId).digest('base64url');
  await context.addCookies([{ name: 'shelfie_device', value: `${householdId}.${sig}`, url: 'http://localhost:4200' }]);
}
