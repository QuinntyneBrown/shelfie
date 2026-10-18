import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { reviewEverything } from '../../../../e2e/support/database';
import { ReviewPage } from '../../../../e2e/pages/review.page';
import { ShellPage } from '../../../../e2e/pages/shell.page';

// Paced to the narration in script.md: the summary and badge, This week, Waiting for you, the reward card, Recent activity.
test('review-queue', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  const shell = new ShellPage(page);
  await review.summary().hover();
  await page.waitForTimeout(4000);
  await shell.queueBadge('top').hover();
  await page.waitForTimeout(5000);
  await review.stat('Streak').hover();
  await page.waitForTimeout(6000);
  await review.queue().first().hover();
  await page.waitForTimeout(4000);
  await review.queue().nth(1).hover();
  await page.waitForTimeout(5000);
  await review.rewardCard('Matilda').scrollIntoViewIfNeeded();
  await review.rewardCard('Matilda').hover();
  await page.waitForTimeout(5000);
  await review.activity().first().scrollIntoViewIfNeeded();
  await review.activity().first().hover();
  await page.waitForTimeout(6000);
});

// Paced to the narration in script.md: the All caught up message.
test('all-caught-up', async ({ page }) => {
  reviewEverything();
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.caughtUp().hover();
  await page.waitForTimeout(7000);
});
