import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration: saving fails and the danger toast stays, then Retry saves and the success toast shows.
test('toasts-for-success-and-errors', async ({ page }) => {
  await signInAsNia(page);
  await page.waitForTimeout(3000);
  await new ShelfPage(page).logChapter('On the go', LION, 12);

  const log = new LogChapterPage(page);
  await page.waitForTimeout(1500);
  await log.answerBox(1).pressSequentially('Edmund said sorry.', { delay: 100 });
  await log.failSaving();
  await page.waitForTimeout(1000);
  await log.done();
  await log.failureToasts().waitFor();
  await page.waitForTimeout(11000);

  await log.repairSaving();
  await log.retry();
  await log.undoToast().waitFor();
  await page.waitForTimeout(11000);
});
