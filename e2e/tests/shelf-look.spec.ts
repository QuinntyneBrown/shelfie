// Traces to: L2-007, L2-020
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { setReadingDays } from '../support/database';

test('Given Nia’s books, when her shelf shows, then each book card takes a wash of its cover colour', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();

  const robot = await shelf.bookTint('On the go', 'The Wild Robot', 'mint');
  expect(robot.background).toBe(robot.expected);
  const lion = await shelf.bookTint('On the go', 'The Lion, the Witch and the Wardrobe', 'sage');
  expect(lion.background).toBe(lion.expected);
});

test('Given Nia logged The Lion most recently, when her shelf shows, then Keep reading offers its next chapter and takes her to log it', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.keepReading()).toContainText('The Lion, the Witch and the Wardrobe');
  await expect(shelf.keepReading()).toContainText('11 of 17');
  await shelf.logFromHero(12);
  await expect(page).toHaveURL(/\/books\/b-lion\/chapters\/12\/log$/);
});

test('Given Nia read only today, when her shelf shows, then the week strip has seven days with today read and marked', async ({ page }) => {
  await setReadingDays([0]);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.weekStrip()).toHaveAccessibleName('This week: read on 1 day, today');
  expect(await shelf.weekStripCounts()).toEqual({ days: 7, read: 1, today: 1 });
});
