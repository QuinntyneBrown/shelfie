import type { BrowserContext } from '@playwright/test';
import { SAME_SITE } from './same-site';
import { DAD } from './accounts';

/** Makes the browser a known device by signing Dad in once, as he would on first use. */
export async function rememberDevice(context: BrowserContext) {
  const response = await context.request.post('/api/auth/password', { ...SAME_SITE, data: DAD });
  if (!response.ok()) throw new Error(`Could not remember the device: ${response.status()}`);
}
