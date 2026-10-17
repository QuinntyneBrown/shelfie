// Traces to: L2-014
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ReviewPage } from '../pages/review.page';

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
