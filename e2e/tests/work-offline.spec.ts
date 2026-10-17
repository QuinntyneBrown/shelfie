// Traces to: L2-024
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { ShelfPage } from '../pages/shelf.page';
import { BookPage } from '../pages/book.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { readOnOf } from '../support/database';

const LION = 'The Lion, the Witch and the Wardrobe';

async function logChapter12Offline(page: import('@playwright/test').Page) {
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', LION);
  const book = new BookPage(page);
  await book.logNext(12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'They had a feast.');
  await new ShellPage(page).goOffline();
  await log.done();
  return { book, log };
}

test('Given Nia goes offline, then a banner says so on every page and goes when she is back online', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(new ShelfPage(page).book('On the go', 'The Wild Robot')).toBeVisible();

  await shell.goOffline();
  await expect(shell.offlineBanner()).toContainText('Showing what we saved earlier.');
  await shell.goOnline();
  await expect(shell.offlineBanner()).toHaveCount(0);
});

test('Given Nia loaded her shelf, when she goes offline and comes back to it, then it is still readable', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await new ShellPage(page).goOffline();

  await page.getByRole('link', { name: 'Add a book' }).click();
  await page.getByRole('link', { name: 'Cancel' }).click();

  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await expect(shelf.loadError()).toHaveCount(0);
});

test('Given Nia logs a chapter while offline, then it is kept on her device and the book shows it will send', async ({ page }) => {
  const { book, log } = await logChapter12Offline(page);

  await expect(log.toast('We saved Chapter 12 on this device and will send it when you’re back online.')).toBeVisible();
  await expect(book.heading()).toHaveText(LION);
  await expect(book.chapterRow(12)).toContainText('Will send');
  expect(readOnOf('b-lion', 12)).toBeUndefined();
});
