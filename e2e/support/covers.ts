import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

/** A cover picture file the tests upload, from e2e/fixtures. */
export function coverFixture(name = 'cover.jpg') {
  return join(import.meta.dirname, '../fixtures', name);
}

/** Gives a book its cover picture as whoever is signed in, straight through the API. */
export async function uploadCoverViaApi(page: Page, bookId: string, file = coverFixture()) {
  const response = await page.request.put(`/api/books/${bookId}/cover`, {
    headers: { 'X-Requested-With': 'Shelfie', 'Content-Type': 'image/jpeg' },
    data: readFileSync(file),
  });
  return ((await response.json()) as { coverImage: string }).coverImage;
}

/** Makes every cover picture fail to load, as a dropped connection would. */
export async function breakCoverPictures(page: Page) {
  await page.route('**/api/books/*/cover?v=*', (route) => (route.request().method() === 'GET' ? route.abort() : route.continue()));
}
