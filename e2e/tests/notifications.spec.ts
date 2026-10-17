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

test('Given four toasts are showing, then three show with a +1 more line that opens the rest', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'Edmund said sorry');
  await log.failSaving();

  for (let attempt = 1; attempt <= 4; attempt++) {
    await log.doneByKeyboard();
    await expect(log.failureToasts()).toHaveCount(Math.min(attempt, 3));
  }

  await expect(log.moreToasts()).toHaveText('+1 more');
  await log.showMoreToasts();
  await expect(log.failureToasts()).toHaveCount(4);
  await expect(log.moreToasts()).toBeHidden();
});
