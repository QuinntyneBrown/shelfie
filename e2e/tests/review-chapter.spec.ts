// Traces to: L2-015
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ReviewPage } from '../pages/review.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';
import { ShellPage } from '../pages/shell.page';

test('Given a chapter waiting, when Dad picks a sticker, adds a note and sends, then it is reviewed and the next chapter is offered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAsDad(page);
  await new ReviewPage(page).review(11);

  const chapter = new ReviewChapterPage(page);
  await expect(chapter.heading()).toHaveText('Chapter 11');
  await expect(chapter.answers().nth(0)).toContainText('Father Christmas gave them presents.');
  await expect(chapter.stickers()).toHaveCount(6);
  await chapter.pickSticker('Wise owl');
  await chapter.noteField().fill('Lovely answer, Nia.');
  await chapter.send();

  await expect(chapter.sentHeading()).toBeVisible();
  await expect(page.getByText('She’ll see your Wise owl and note the next time she opens Shelfie.')).toBeVisible();
  await expect(new ShellPage(page).queueBadge('top')).toHaveAccessibleName('1 chapter to review');
  await chapter.reviewNext(10);
  await expect(chapter.heading()).toHaveText('Chapter 10');
});
