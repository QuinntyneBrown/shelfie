import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { BooksPage } from '../../../../e2e/pages/books.page';
import { AddBookPage } from '../../../../e2e/pages/add-book.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';

// Paced to the narration in script.md: Books, the form typed in, the cover picked, then Add to my shelf.
test('add-a-book', async ({ page }) => {
  await signInAsDad(page);
  await page.waitForTimeout(3000);
  await new ShellPage(page).navLink('top', 'Books').click();
  const books = new BooksPage(page);
  await books.addBookLink().hover();
  await page.waitForTimeout(1000);
  await books.addBookLink().click();

  const add = new AddBookPage(page);
  await add.heading().waitFor();
  await page.waitForTimeout(1500);
  await add.titleField().pressSequentially('The Hobbit', { delay: 120 });
  await page.waitForTimeout(2000);
  await add.authorField().pressSequentially('J. R. R. Tolkien', { delay: 120 });
  await page.waitForTimeout(4000);
  await add.chaptersField().pressSequentially('19', { delay: 200 });
  await page.waitForTimeout(4000);

  await add.pick('Peach');
  await page.waitForTimeout(3000);
  await add.pick('Dragon');
  await page.waitForTimeout(1500);
  await add.preview().hover();
  await page.waitForTimeout(5000);

  await add.submit();
  const shelf = new ShelfPage(page);
  await shelf.toast('The Hobbit is on your shelf under Up next.').waitFor();
  await page.waitForTimeout(5000);
  await shelf.book('Up next', 'The Hobbit').hover();
  await page.waitForTimeout(6000);
});
