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
