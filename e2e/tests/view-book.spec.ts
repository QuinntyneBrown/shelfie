// Traces to: L2-008
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { BookPage } from '../pages/book.page';
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
