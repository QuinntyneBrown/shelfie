import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ReviewPage } from '../../../../e2e/pages/review.page';
import { ReviewChapterPage } from '../../../../e2e/pages/review-chapter.page';

// Paced to the narration in script.md: sign in and open chapter 11, her answers, the sticker and note, then Send.
test('review-a-chapter', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.queue().first().hover();
  await page.waitForTimeout(5000);
  await review.review(11);

  const chapter = new ReviewChapterPage(page);
  await chapter.answers().first().hover();
  await page.waitForTimeout(11000);
  await chapter.pickSticker('Wise owl');
  await page.waitForTimeout(3000);
  await chapter.noteField().pressSequentially('Lovely answer, Nia.', { delay: 120 });
  await page.waitForTimeout(6000);
  await chapter.send();
  await chapter.sentHeading().waitFor();
  await page.waitForTimeout(9000);
  await chapter.reviewNext(10);
  await chapter.heading().waitFor();
  await page.waitForTimeout(3000);
});
