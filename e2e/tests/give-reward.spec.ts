// Traces to: L2-017, L2-018
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given a finished book, when Dad picks a quick reward and gives it, then Review moves on and the reward is on Nia’s trophy shelf', async ({ page, browser, baseURL }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openGiveReward('Matilda');

  await expect(review.rewardDialog()).toContainText('Pick a reward and Nia will see it on her shelf.');
  await expect(review.rewardField()).toBeFocused();
  await expect(review.rewardDialog().getByRole('group', { name: 'Quick picks' }).getByRole('button')).toHaveCount(4);
  await review.quickPick('Movie night').click();
  await expect(review.rewardField()).toHaveValue('Movie night');
  await expect(review.quickPick('Movie night')).toHaveAttribute('aria-pressed', 'true');
  await review.giveReward();

  await expect(page.getByRole('status').getByText('Reward given!')).toBeVisible();
  await expect(review.rewardCard('Matilda')).toHaveCount(0);
  await expect(review.summary()).toContainText('0 rewards to give');

  const herDevice = await browser.newContext({ baseURL });
  const nia = await herDevice.newPage();
  await signInAsNia(nia);
  await expect(new ShelfPage(nia).finishedBook('Matilda')).toContainText('Movie night ·');
  await herDevice.close();
});

for (const text of ['', 'x'.repeat(101)]) {
  test(`Given a reward of ${text.length} characters, when Dad gives it, then he is told what to fix and nothing is sent`, async ({ page }) => {
    await signInAsDad(page);
    const review = new ReviewPage(page);
    review.watchRewardPosts();
    await review.openGiveReward('Matilda');
    await review.rewardField().fill(text);
    await review.giveReward();

    await expect(review.rewardField()).toHaveAccessibleDescription(/Tell Nia what the reward is|Keep it to 100 characters/);
    expect(review.rewardPostCount()).toBe(0);
  });
}

test('Given saving fails, when Dad gives a reward, then the dialog says so and keeps what he typed', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openGiveReward('Matilda');
  await review.breakRewards();
  await review.rewardField().fill('Ice cream Saturday');
  await review.giveReward();

  await expect(review.rewardDialog()).toContainText('The reward wasn’t saved');
  await expect(review.rewardField()).toHaveValue('Ice cream Saturday');
});

test('Given a request that skips the page, then a second reward, a reader’s reward or a reward for an unfinished book is refused', async ({ page }) => {
  await signInAsNia(page);
  const review = new ReviewPage(page);
  expect((await review.postRewardViaApi('b-matilda', { text: 'Cake' })).status()).toBe(403);

  await page.context().clearCookies();
  await signInAsDad(page);
  const second = await review.postRewardViaApi('b-web', { text: 'Another one' });
  const unfinished = await review.postRewardViaApi('b-lion', { text: 'Too soon' });
  expect([second.status(), (await second.json()).type]).toEqual([409, 'reward-exists']);
  expect([unfinished.status(), (await unfinished.json()).type]).toEqual([400, 'book-not-finished']);
  expect((await review.postRewardViaApi('b-other', { text: 'Not yours' })).status()).toBe(404);
});

test('Given a book with a reward, when Dad manages it, then the reward is shown at the top', async ({ page }) => {
  await signInAsDad(page);
  await page.goto('/manage-book/b-web');

  await expect(page.getByRole('region', { name: /Rewarded/ })).toContainText('Rewarded: Movie night with popcorn');
});
