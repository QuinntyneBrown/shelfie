// Traces to: L2-024
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { ShelfPage } from '../pages/shelf.page';
import { BookPage } from '../pages/book.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { loggedAtOf, readOnOf } from '../support/database';

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

/** Arranges chapters already kept on the device, as if logged offline earlier. */
async function keepOnDevice(page: import('@playwright/test').Page, chapters: { bookId: string; chapterNumber: number }[]) {
  await page.evaluate((pending) => localStorage.setItem('shelfie.pending-chapter-logs', JSON.stringify(pending)), chapters.map((c) => ({
    ...c,
    body: { readOn: new Date().toISOString().slice(0, 10), answers: [{ position: 1, text: 'Kept on the device.' }] },
    queuedAt: new Date().toISOString(),
  })));
}

test('Given a chapter kept offline, when Nia is back online, then it is sent and toasts confirm', async ({ page }) => {
  const { log } = await logChapter12Offline(page);
  await new ShellPage(page).goOnline();

  await expect(log.toast('Chapter 12 saved')).toBeVisible();
  await expect(log.toast('Everything you logged has been sent.')).toBeVisible();
  await expect.poll(() => loggedAtOf('b-lion', 12)).toBeDefined();
});

test('Given two chapters kept on the device, when the app starts online, then they are sent in the order she logged them', async ({ page }) => {
  await signInAsNia(page);
  await keepOnDevice(page, [{ bookId: 'b-lion', chapterNumber: 12 }, { bookId: 'b-robot', chapterNumber: 4 }]);
  await page.reload();

  await expect(new LogChapterPage(page).toast('Everything you logged has been sent.')).toBeVisible();
  const [lion, robot] = [loggedAtOf('b-lion', 12), loggedAtOf('b-robot', 4)];
  expect(lion && robot && lion < robot).toBe(true);
});

test('Given a kept chapter the server already has, when it is sent again, then it counts as sent', async ({ page }) => {
  const { book, log } = await logChapter12Offline(page);
  await page.route('**/api/books/b-lion/chapters/12', (route) =>
    route.fulfill({ status: 409, json: { type: 'chapter-already-logged' } }),
  );
  await new ShellPage(page).goOnline();

  await expect(log.toast('Chapter 12 saved')).toBeVisible();
  await expect(book.chapterRow(12)).not.toContainText('Will send');
});

test('Given sending a kept chapter fails, then it stays kept and Retry sends it once the server answers', async ({ page }) => {
  const { book, log } = await logChapter12Offline(page);
  await page.route('**/api/books/b-lion/chapters/12', (route) =>
    route.fulfill({ status: 500, json: { type: 'about:blank', requestId: 'SHF-0001' } }),
  );
  await new ShellPage(page).goOnline();

  await expect(log.toast('Couldn’t send Chapter 12')).toBeVisible();
  await expect(book.chapterRow(12)).toContainText('Will send');
  await page.unroute('**/api/books/b-lion/chapters/12');
  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(log.toast('Chapter 12 saved')).toBeVisible();
  await expect.poll(() => loggedAtOf('b-lion', 12)).toBeDefined();
});
