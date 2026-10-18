import { test } from '../../../../tools/video-record/test';
import { signInAsDad, signInAsNia } from '../../../../e2e/support/signed-in';
import { ErrorPage } from '../../../../e2e/pages/error.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';

// Paced to the narration in script.md: the Review address shows the lock, back to the shelf, then an old link.
test('nia-meets-the-lock', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  const error = new ErrorPage(page);
  await page.waitForTimeout(4000);
  await page.goto('/review');
  await error.heading().waitFor();
  await page.waitForTimeout(6000);
  await error.homeLink('Back to my shelf').hover();
  await page.waitForTimeout(1500);
  await error.backToShelf();
  await shelf.greeting().waitFor();
  await page.waitForTimeout(3000);

  await page.goto('/no/such/page');
  await error.heading().waitFor();
  await page.waitForTimeout(4000);
  await error.homeLink('Back to my shelf').hover();
  await page.waitForTimeout(1000);
  await error.backToShelf();
  await shelf.greeting().waitFor();
  await page.waitForTimeout(3000);
});

// Paced to the narration in script.md: Dad lands on Review, an unknown address offers Go to Review.
test('dad-finds-review', async ({ page }) => {
  await signInAsDad(page);
  await page.waitForTimeout(4000);
  await page.goto('/no/such/page');
  const error = new ErrorPage(page);
  await error.heading().waitFor();
  await page.waitForTimeout(5000);
  await error.homeLink('Go to Review').hover();
  await page.waitForTimeout(1500);
  await error.homeLink('Go to Review').click();
  await page.waitForURL('**/review');
  await page.waitForTimeout(3000);
});
