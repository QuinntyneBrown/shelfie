import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { BookPage } from '../../../../e2e/pages/book.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration in script.md: the three groups one by one, then she opens a book.
test('browse-the-shelf', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.greeting().waitFor();
  await page.waitForTimeout(8000);

  await shelf.book('On the go', LION).hover();
  await page.waitForTimeout(11000);
  await shelf.book('Up next', 'Because of Winn-Dixie').hover();
  await page.waitForTimeout(8000);
  await shelf.finishedBook('Charlotte’s Web').hover();
  await page.waitForTimeout(5000);
  await shelf.finishedBook('Matilda').hover();
  await page.waitForTimeout(5000);

  await shelf.openBook('On the go', LION);
  const book = new BookPage(page);
  await book.primaryAction(12).hover();
  await page.waitForTimeout(9000);
});
