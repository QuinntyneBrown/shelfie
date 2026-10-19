// Traces to: L2-137, L2-138, L2-139, L2-140, L2-141
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addTheo, householdDay, logChaptersAs, setReadingDays, startChallengeInDatabase } from '../support/database';
import { ReviewPage } from '../pages/review.page';
import { StartChallengeDialog } from '../pages/start-challenge-dialog.page';

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

test('Given no challenge, when Dad starts one for both readers, then a toast confirms it and the board shows them at 0', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openChallenges();
  await expect(review.noChallengeYet()).toBeVisible();

  await review.startChallenge();
  const dialog = new StartChallengeDialog(page);
  await expect(dialog.nameField()).toBeFocused();
  await expect(dialog.goalField()).toHaveValue('15');
  await expect(dialog.choice('What counts', 'Chapters logged')).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.choice('How long', 'Two weeks')).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.readerSwitch('Nia')).toBeChecked();
  await expect(dialog.readerSwitch('Theo')).toBeChecked();
  await expect(dialog.dialog()).toContainText('Starts today');

  await dialog.fill({ name: 'Half-term reading race', goal: '20', length: 'One week' });
  await dialog.start();

  await expect(dialog.dialog()).toBeHidden();
  await expect(review.toast('Challenge started')).toBeVisible();
  await expect(review.challengeCard('Half-term reading race')).toContainText('Chapters logged · goal 20');
  await expect(review.challengeCard('Half-term reading race')).toContainText('6 days left');
  await expect(review.leaderboard()).toHaveText([/Nia.*0 of 20/s, /Theo.*0 of 20/s]);
  await expect(review.startChallengeButton()).toHaveCount(0);
});

test('Given no name and no reader, when Dad presses Start, then each field says what is missing and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openChallenges();
  await review.startChallenge();
  const dialog = new StartChallengeDialog(page);

  await dialog.fill({ goal: '0' });
  await dialog.leaveOut('Nia');
  await dialog.leaveOut('Theo');
  await dialog.start();

  await expect(dialog.dialog()).toContainText('Give the challenge a name.');
  await expect(dialog.dialog()).toContainText('Pick a goal from 1 to 500.');
  await expect(dialog.dialog()).toContainText('Pick at least one reader.');
  await expect(dialog.nameField()).toHaveAccessibleDescription(/Give the challenge a name\./);
  expect(dialog.postCount()).toBe(0);
});

test('Given the server cannot be reached, when Dad starts a challenge, then the dialog says so and keeps what he chose', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openChallenges();
  await review.startChallenge();
  const dialog = new StartChallengeDialog(page);
  await dialog.breakStarting();

  await dialog.fill({ name: 'Half-term reading race' });
  await dialog.start();

  await expect(dialog.failure()).toBeVisible();
  await expect(dialog.nameField()).toHaveValue('Half-term reading race');
});

test('Given another parent started a challenge meanwhile, when Dad starts his, then the dialog closes and the tab shows the running one', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.openChallenges();
  await review.startChallenge();
  const dialog = new StartChallengeDialog(page);
  await startChallengeInDatabase({ name: 'Mum’s race' });

  await dialog.fill({ name: 'Half-term reading race' });
  await dialog.start();

  await expect(dialog.dialog()).toBeHidden();
  await expect(review.toast('A challenge is already running')).toBeVisible();
  await expect(review.challengeCard('Mum’s race')).toBeVisible();
});

test('Given this week’s reading, when Dad opens the challenge, then three short insights name the top reader, the climber and the longest streak', async ({ page }) => {
  await setReadingDays([]);
  await startChallengeInDatabase();
  await logChaptersAs('p-nia', 1, `${householdDay(-1)}T12:00:00.000Z`);
  await logChaptersAs('p-nia', 1);
  await logChaptersAs('p-theo', 3);
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await review.openChallenges();

  await expect(review.insights()).toHaveText([
    '🏅 Theo read the most this week: 3 chapters',
    '📈 Theo climbed the most: 3 more chapters than last week',
    '🔥 Nia has the longest streak: 2 days',
  ]);
});
