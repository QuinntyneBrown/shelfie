// Traces to: L2-019
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';
import { AddBookPage } from '../pages/add-book.page';
import { BookPage } from '../pages/book.page';

async function finishTheBfg(page: import('@playwright/test').Page) {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', 'The BFG', 3);
  const log = new LogChapterPage(page);
  await log.answer(1, 'The giant blew dreams into bedrooms.');
  await log.done();
  await expect(log.finishedHeading('The BFG')).toBeVisible();
  return log;
}

test('Given Nia logs the last chapter, then confetti celebrates and she can go straight to adding her next book', async ({ page }) => {
  const log = await finishTheBfg(page);

  await expect(log.confetti()).toBeVisible();
  await expect(log.confetti()).toHaveAttribute('aria-hidden', 'true');
  await log.addNextBook();
  await expect(new AddBookPage(page).heading()).toHaveText('Add a book');
});

test('Given Nia prefers reduced motion, when she finishes a book, then the celebration shows without any confetti', async ({ page }) => {
  await new ShellPage(page).preferReducedMotion();
  const log = await finishTheBfg(page);

  await expect(log.confetti()).toHaveCount(0);
});

test('Given a finished book, when Nia opens its page, then it says when she finished it', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openFinishedBook('Matilda');

  const book = new BookPage(page);
  await expect(book.finishedHeading('Matilda')).toBeVisible();
  await expect(book.finishedOn('Tue 13 Oct')).toBeVisible();
});
