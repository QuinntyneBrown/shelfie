import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { coverFixture } from './covers';

/** Adds a picture to a gallery reward as whoever is signed in, straight through the API; returns the featured picture's URL. */
export async function addRewardPictureViaApi(page: Page, rewardId: string, file = coverFixture()) {
  const response = await page.request.post(`/api/gallery-rewards/${rewardId}/pictures`, {
    headers: { 'X-Requested-With': 'Shelfie', 'Content-Type': 'image/jpeg' },
    data: readFileSync(file),
  });
  return ((await response.json()) as { featuredPicture: string }).featuredPicture;
}

/** Every request for a reward picture: uploads, removals, feature changes and the pictures themselves. */
export const rewardPictureRoute = /\/api\/gallery-rewards\/[^/]+\/pictures/;

/** Makes every reward picture fail to load, as a dropped connection would. */
export async function breakRewardPictureImages(page: Page) {
  await page.route(rewardPictureRoute, (route) => (route.request().method() === 'GET' ? route.abort() : route.continue()));
}
