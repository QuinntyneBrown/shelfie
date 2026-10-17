// Traces to: L2-003
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia is signed in, when the page is reloaded, then she is still signed in on the same page', async ({ page }) => {
  await signInAsNia(page);

  await page.reload();

  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});
