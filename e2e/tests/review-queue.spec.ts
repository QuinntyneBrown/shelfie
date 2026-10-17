// Traces to: L2-014
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ReviewPage } from '../pages/review.page';
import { ShellPage } from '../pages/shell.page';
import { reviewEverything, setReadingDays, unreviewEverything } from '../support/database';

test('Given chapters waiting for review, when Dad opens Review, then they are listed newest first with book, chapter and when she read it', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.heading()).toHaveText('Review');
  await expect(review.summary()).toHaveText('2 chapters to read · 1 reward to give');
  await expect(review.queue()).toHaveCount(2);
  await expect(review.queue().nth(0)).toContainText('Chapter 11 · The Lion, the Witch and the Wardrobe');
  await expect(review.queue().nth(0)).toContainText('Nia read it Thu 15 Oct');
  await expect(review.queue().nth(1)).toContainText('Chapter 10 ·');
  await expect(review.queue().nth(0).getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/review/chapters/b-lion-c11');
  await expect(review.rewardCard('Matilda')).toBeVisible();
});

test('Given Nia is signed in, when the review overview is asked for, then the API refuses her', async ({ page }) => {
  await signInAsNia(page);

  expect((await new ReviewPage(page).getViaApi()).status()).toBe(403);
});

test('Given nothing is waiting, when Dad opens Review, then he is told he is all caught up', async ({ page }) => {
  reviewEverything();
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.caughtUp()).toBeVisible();
  await expect(review.queue()).toHaveCount(0);
});

test('Given two chapters wait, then the Review link carries a badge with the count, in the top bar and the phone tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await expect(shell.queueBadge('top')).toHaveAccessibleName('2 chapters to review');

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(shell.queueBadge('tab')).toHaveText('2');
});

test('Given Nia read on the last five days, when Dad opens Review, then This week shows her chapters and her streak', async ({ page }) => {
  // Traces to: L2-020
  setReadingDays([0, 1, 2, 3, 4]);
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.stat('Chapters')).toContainText('5');
  await expect(review.stat('Streak')).toContainText('5');
});

test('Given a long queue on a phone, when Dad opens Review, then it fits the screen, every chapter can be reached and the summary notices', async ({ page }) => {
  unreviewEverything();
  await page.setViewportSize({ width: 360, height: 700 });
  await signInAsDad(page);
  const review = new ReviewPage(page);
  const shell = new ShellPage(page);

  await expect(review.queue()).toHaveCount(22);
  await expect(review.summary()).toContainText('22 chapters to read');
  await expect(review.summary()).toContainText('back from a week away?');
  expect(await shell.scrollsSideways()).toBe(false);
  const last = review.queue().last().getByRole('link', { name: 'Review' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});
