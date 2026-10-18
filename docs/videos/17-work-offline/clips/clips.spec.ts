import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { BookPage } from '../../../../e2e/pages/book.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration: the connection drops mid-answer, the chapter is kept on the device, then sent once back online.
test('keep-logging-offline', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const book = new BookPage(page);
  const log = new LogChapterPage(page);
  await page.waitForTimeout(1000);
  await new ShelfPage(page).openBook('On the go', LION);
  await page.waitForTimeout(1500);
  await book.primaryAction(12).hover();
  await book.logNext(12);
  await page.waitForTimeout(1500);

  await log.answerBox(1).pressSequentially('They had a feast.', { delay: 100 });
  await shell.goOffline();
  await shell.offlineBanner().waitFor();
  await page.waitForTimeout(5000);

  await log.done();
  await book.chapterRow(12).waitFor();
  await page.waitForTimeout(1500);
  await book.chapterRow(12).hover();
  await page.waitForTimeout(6500);

  await shell.goOnline();
  await log.toast('Everything you logged has been sent.').waitFor();
  await page.waitForTimeout(8000);
});
