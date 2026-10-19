// Traces to: L2-137, L2-139, L2-140
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addTheo, logChaptersAs, startChallengeInDatabase } from '../support/database';
import { ReviewPage } from '../pages/review.page';

test.beforeEach(async () => {
  await addTheo();
});

test('Given Nia and Theo in a running race, when Dad opens the Challenges tab, then the leaderboard ranks them with Nia in the lead', async ({ page }) => {
  await startChallengeInDatabase();
  await logChaptersAs('p-nia', 3);
  await logChaptersAs('p-theo', 1);
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await review.showTab('Challenges');

  await expect(review.challengeCard('Half-term reading race')).toContainText('Chapters logged · goal 15');
  await expect(review.challengeCard('Half-term reading race')).toContainText('13 days left');
  await expect(review.leaderboard()).toHaveText([/Nia\s*In the lead.*3 of 15/s, /Theo.*1 of 15/s]);
  await expect(review.leaderboard().first().getByRole('progressbar')).toHaveAccessibleName('Nia: 3 of 15 chapters');

  await review.showTab('To review');
  await expect(review.queue()).toHaveCount(2 + 4);
});

test('Given a link to the Challenges tab, when Dad opens it, then Review starts on that tab', async ({ page }) => {
  await startChallengeInDatabase();
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await review.openChallenges();

  await expect(review.leaderboard()).toHaveCount(2);
});
