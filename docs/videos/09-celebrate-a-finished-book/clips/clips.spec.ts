import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';
import { BookPage } from '../../../../e2e/pages/book.page';

// Paced to the narration in script.md: log the last chapter of The BFG, the celebration, then back to the shelf
// and the finished book's trophy card.
test('celebrate-a-finished-book', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.book('On the go', 'The BFG').hover();
  await page.waitForTimeout(4000);
  await shelf.logChapter('On the go', 'The BFG', 3);

  const log = new LogChapterPage(page);
  await page.waitForTimeout(2000);
  await log.answerBox(1).pressSequentially('The giant blew dreams into bedrooms.', { delay: 100 });
  await page.waitForTimeout(1500);
  await log.done();
  await log.finishedHeading().waitFor();
  await page.waitForTimeout(13000);
  await log.backToShelf();
  await shelf.finishedBook('The BFG').scrollIntoViewIfNeeded();
  await shelf.finishedBook('The BFG').hover();
  await page.waitForTimeout(5000);
  await shelf.openFinishedBook('The BFG');
  await new BookPage(page).trophy().hover();
  await page.waitForTimeout(5000);
});
