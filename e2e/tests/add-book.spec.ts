// Traces to: L2-009
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { AddBookPage } from '../pages/add-book.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia is on her shelf, when she adds a book from the Add a book button, then it is on her shelf under Up next and a toast says so', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.addBook();

  const add = new AddBookPage(page);
  await expect(add.heading()).toHaveText('Add a book');
  await add.fill({ title: 'The Hobbit', author: 'J. R. R. Tolkien', chapters: 19, colour: 'Peach', sticker: 'Dragon' });
  await add.submit();

  await expect(page).toHaveURL(/\/shelf$/);
  await expect(shelf.toast('The Hobbit is on your shelf under Up next.')).toBeVisible();
  const book = shelf.book('Up next', 'The Hobbit');
  await expect(book.getByRole('link', { name: 'Start with Chapter 1' })).toBeVisible();
  await expect(shelf.cover('Up next', 'The Hobbit')).toHaveText('🐉');
  await expect(shelf.cover('Up next', 'The Hobbit')).toHaveClass(/cover--peach/);
});
