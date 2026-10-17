// Traces to: L2-023
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given saving fails, when Nia presses I’m done!, then a danger toast with Retry stays up, her answers stay, and Retry saves them', async ({ page }) => {
  const log = new LogChapterPage(page);
  await log.useFakeTimers();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  await log.answer(1, 'Edmund said sorry');
  await log.failSaving();

  await log.done();
  await expect(log.failureToasts()).toBeVisible();
  await log.letTimePass(60000);
  await expect(log.failureToasts()).toBeVisible();
  await expect(log.answerBox(1)).toHaveValue('Edmund said sorry');

  await log.repairSaving();
  await log.retry();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  await expect(log.failureToasts()).toBeHidden();
});
