import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration in script.md: sign in and pick the chapter, the day, the questions, then I'm done!
test('log-a-chapter', async ({ page }) => {
  await signInAsNia(page);
  await page.waitForTimeout(5000);
  await new ShelfPage(page).logChapter('On the go', LION, 12);

  const log = new LogChapterPage(page);
  await page.waitForTimeout(6000);
  await log.dayChosen('Today').hover();
  await page.waitForTimeout(5000);
  await log.answerBox(1).pressSequentially('Edmund said sorry to the animals.', { delay: 120 });
  await page.waitForTimeout(4000);
  await log.answerBox(2).pressSequentially('He felt bad about what he did.', { delay: 120 });
  await page.waitForTimeout(4000);
  await log.done();
  await log.heading().waitFor();
  await page.waitForTimeout(9000);
  await log.backToShelf();
  await page.waitForTimeout(3000);
});
