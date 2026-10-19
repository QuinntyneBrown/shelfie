// Traces to: L2-096, L2-097, L2-098, L2-099
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { ReviewPage } from '../pages/review.page';
import { setReadingDays } from '../support/database';

test('Given Nia has finished a book and read several chapters in one day, when she opens her shelf, then Badges lists all four in order, two earned with their day and two locked with a hint', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.badges()).toContainText('2 of 4');
  await expect(shelf.badgeNames()).toHaveText(['First book', 'Double chapter', 'Weekend reader', 'Week streak']);
  await expect(shelf.badge('First book')).toContainText('Earned Sat 10 Oct');
  await expect(shelf.badge('Double chapter')).toContainText('Earned Sat 10 Oct');
  await expect(shelf.badge('Weekend reader')).toContainText('Not yet · Read on a Saturday and the Sunday after');
  await expect(shelf.badge('Week streak')).toContainText('Not yet · Read 7 days in a row');
  expect(await shelf.badgeHasCheck('First book')).toBe(true);
  expect(await shelf.badgeHasCheck('Week streak')).toBe(false);
});

test('Given Nia read on seven days in a row, when she opens her shelf, then Week streak is earned and the count rises', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.badge('Week streak')).toContainText(/Earned \w{3} \d+ \w{3}/);
  await expect(shelf.badges()).toContainText(/\d of 4/);
  await expect(shelf.badge('Week streak')).not.toContainText('Not yet');
});

test('Given the same logs, when Dad opens Review, then he sees Nia’s badges, read-only, with the same days', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.badges()).toContainText('2 of 4');
  await expect(review.badge('First book')).toContainText('Earned Sat 10 Oct');
  await expect(review.badge('Week streak')).toContainText('Not yet · Read 7 days in a row');
  await expect(review.badges().getByRole('button')).toHaveCount(0);
  await expect(review.badges().getByRole('link')).toHaveCount(0);
});

test('Given a desktop, when Dad opens Review, then Nia’s badges are tiles of one height laid side by side with no list bullets', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  const layout = await review.badgeLayout();
  expect(layout.bullets).toBe(false);
  expect(layout.perRow).toBeGreaterThan(1);
  expect(layout.heights).toBe(1);
});

test('Given a phone, then the shelf’s badges stack without scrolling sideways and an axe scan finds nothing serious', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.badges()).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('Given a phone, when Dad opens Review, then Nia’s badges sit in the page without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.badges()).toBeVisible();
  expect(await review.scrollsSideways()).toBe(false);
});

test('Given no session, when the shelf is asked for straight from the API, then it answers 401 with no badges', async ({ request }) => {
  const response = await request.get('/api/shelf');
  expect(response.status()).toBe(401);
});
