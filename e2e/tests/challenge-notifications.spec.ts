// Traces to: L2-145
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { SettingsPage } from '../pages/settings.page';
import { ReviewPage } from '../pages/review.page';
import { addPushDevice, addTheo, forgetSeededLogs, logChaptersAs, startChallengeInDatabase } from '../support/database';
import { givenBrowserPush, pushedTo } from '../support/push';

const LEAD = 'Tell me when a reader takes the lead in a challenge';
const END = 'Tell me when a challenge ends';

test.use({ push: 'on' });

test('Given the two challenge choices start on, when Dad turns “challenge ends” off and saves, then it stays off and the other stays on', async ({ page }) => {
  await givenBrowserPush(page, { permission: 'default' });
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.choice(LEAD)).toBeChecked();
  await expect(settings.choice(END)).toBeChecked();

  await settings.choice(END).uncheck();
  await settings.save();
  await expect(settings.banner()).toBeVisible();
  await page.reload();

  await expect(settings.choice(END)).not.toBeChecked();
  await expect(settings.choice(LEAD)).toBeChecked();
});

test('Given Dad’s phone is subscribed, when he ends a race Theo leads, then the phone is told who won', async ({ page }) => {
  await addTheo();
  await forgetSeededLogs();
  await addPushDevice('dad', 'https://push.example.com/dads-phone');
  const id = await startChallengeInDatabase();
  await logChaptersAs('p-theo', 1);
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openChallenges();

  await review.endNow();

  await expect(review.toast('Challenge ended')).toBeVisible();
  expect(pushedTo('https://push.example.com/dads-phone')).toEqual([
    { title: '🏁 Half-term reading race is over: Theo won!', body: 'Give a reward from Review.', url: '/review?tab=challenges', tag: `challenge-end-${id}` },
  ]);
});
