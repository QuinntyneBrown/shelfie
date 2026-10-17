// Traces to: L2-008
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { BookPage } from '../pages/book.page';
import { ErrorPage } from '../pages/error.page';
import { ShelfPage } from '../pages/shelf.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given Nia opens a book from her shelf, then she sees its progress and every chapter, logged ones with their first line and review status', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', LION);

  const book = new BookPage(page);
  await expect(book.heading()).toHaveText(LION);
  await expect(book.progress('11 of 17 chapters read')).toBeVisible();

  const first = book.chapterRow(1);
  await expect(first).toContainText('Lucy found a wardrobe in the empty room and went inside.');
  await expect(first).toContainText('Waiting for Dad');

  const next = book.chapterRow(12);
  await expect(next).toContainText('Up next');
  await expect(next).toHaveAttribute('href', '/books/b-lion/chapters/12/log');
  await expect(book.chapterRow(17)).not.toHaveAttribute('href', /.+/);
});

test('Given a phone screen, when Nia opens a book, then the action for the next chapter is on screen without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', LION);

  await expect(new BookPage(page).primaryAction(12)).toBeInViewport();
});

test('Given a finished book with a reward, when Nia opens it, then the reward shows instead of an action', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openFinishedBook('Charlotte’s Web');

  const book = new BookPage(page);
  await expect(book.progress('3 of 3 chapters read')).toBeVisible();
  await expect(page.getByText('3 of 3 · finished!')).toBeVisible();
  await expect(book.trophy()).toContainText('Movie night with popcorn');
  await expect(page.getByRole('link', { name: /I read Chapter/ })).toHaveCount(0);
});

test('Given a finished book still waiting for its reward, when Nia opens it, then it says Dad is picking one', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openFinishedBook('Matilda');

  const book = new BookPage(page);
  await expect(book.trophy()).toContainText('Dad is picking your reward. It will show up here and on your shelf.');
  await expect(book.trophy().getByRole('link', { name: 'Back to my shelf' })).toBeVisible();
});

for (const id of ['no-such-book', 'b-other']) {
  test(`Given a book id that is not in Nia’s family (${id}), when she opens it, then she sees the Not found page`, async ({ page }) => {
    await signInAsNia(page);
    await page.goto(`/book/${id}`);

    await expect(new ErrorPage(page).heading()).toHaveText('We can’t find that page');
  });
}

test('Given the server fails, when Nia opens a book, then she is told the chapters did not load and can try again', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  const book = new BookPage(page);
  await expect(shelf.book('On the go', LION)).toBeVisible();
  await book.breakLoading();
  await shelf.openBook('On the go', LION);

  await expect(book.loadFailure()).toBeVisible();
  await book.repairLoading();
  await book.tryAgain();

  await expect(book.heading()).toHaveText(LION);
});

test('Given a book with 80 chapters, when Nia opens it, then chapters after the first ten fold away until she opens them', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', 'The Wild Robot');
  const book = new BookPage(page);

  await expect(book.chapterRow(10)).toBeVisible();
  await expect(book.chapterRow(11)).toBeHidden();
  await expect(book.hiddenChapters()).toHaveText('Chapters 11 to 80 (70 more)');
  await book.hiddenChapters().click();

  await expect(book.chapterRow(80)).toBeVisible();
});
