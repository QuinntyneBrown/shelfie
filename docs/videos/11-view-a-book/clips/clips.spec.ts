import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { BookPage } from '../../../../e2e/pages/book.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration in script.md: the progress bar, logged chapters, Waiting for Dad, then Up next.
test('inside-a-book', async ({ page }) => {
  await signInAsNia(page);
  await page.waitForTimeout(2000);
  await new ShelfPage(page).openBook('On the go', LION);

  const book = new BookPage(page);
  await book.progress('11 of 17 chapters read').hover();
  await page.waitForTimeout(5000);
  await book.chapterRow(1).hover();
  await page.waitForTimeout(5000);
  await book.chapterRow(2).hover();
  await page.waitForTimeout(3000);
  await book.chapterRow(11).hover();
  await page.waitForTimeout(4000);
  await book.chapterRow(12).hover();
  await page.waitForTimeout(3000);
  await book.primaryAction(12).hover();
  await page.waitForTimeout(4000);
  await book.chapterRow(17).hover();
  await page.waitForTimeout(4000);
});

// Paced to the narration: The Wild Robot folds after chapter ten; Charlotte's Web shows its reward.
test('long-and-finished-books', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.openBook('On the go', 'The Wild Robot');

  const book = new BookPage(page);
  await book.hiddenChapters().hover();
  await page.waitForTimeout(4000);
  await book.hiddenChapters().click();
  await page.waitForTimeout(3000);
  await book.backToShelf();
  await page.waitForTimeout(1500);
  await shelf.openFinishedBook('Charlotte’s Web');
  await book.trophy().hover();
  await page.waitForTimeout(11000);
});
