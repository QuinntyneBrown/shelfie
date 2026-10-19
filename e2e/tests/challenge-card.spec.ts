// Traces to: L2-140, L2-144
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { addTheo, logChaptersAs, startChallengeInDatabase } from '../support/database';
import { ShelfPage } from '../pages/shelf.page';

test.beforeEach(async () => {
  await addTheo();
});

test('Given Nia leads the race, when she opens her shelf, then the Challenge card shows the board with her row marked and cheers her on', async ({ page }) => {
  await startChallengeInDatabase();
  await logChaptersAs('p-nia', 3);
  await logChaptersAs('p-theo', 1);

  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.challengeCard()).toContainText('Half-term reading race');
  await expect(shelf.challengeCard()).toContainText('Chapters logged · goal 15 · 13 days left');
  await expect(shelf.challengeLeaderboard()).toHaveText([/Nia \(you\).*In the lead.*3 of 15/s, /Theo.*1 of 15/s]);
  await expect(shelf.challengeCard()).toContainText('You’re in the lead. Keep going!');
});

test('Given Theo is ahead, then Nia sees how many chapters to catch him', async ({ page }) => {
  await startChallengeInDatabase();
  await logChaptersAs('p-theo', 3);
  await logChaptersAs('p-nia', 1);

  await signInAsNia(page);

  await expect(new ShelfPage(page).challengeCard()).toContainText('2 to catch Theo. You can do it!');
});

test('Given they are level, then both share the lead and Nia hears one more puts her ahead', async ({ page }) => {
  await startChallengeInDatabase();
  await logChaptersAs('p-theo', 2);
  await logChaptersAs('p-nia', 2);

  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.challengeLeaderboard()).toHaveText([/Nia \(you\).*In the lead/s, /Theo.*In the lead/s]);
  await expect(shelf.challengeCard()).toContainText('You’re level with Theo. One more puts you ahead!');
});

test('Given Nia is the only reader taking part, then she sees her progress toward the goal instead of a board', async ({ page }) => {
  await startChallengeInDatabase({ readerIds: ['p-nia'] });
  await logChaptersAs('p-nia', 3);

  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.challengeProgress()).toHaveAccessibleName('3 of 15 chapters');
  await expect(shelf.challengeLeaderboard()).toHaveCount(0);
  await expect(shelf.challengeCard()).toContainText('12 more to reach the goal.');
});

test('Given a challenge Nia does not take part in, or none, then her shelf has no Challenge card', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.greeting()).toBeVisible();
  await expect(page.getByText('On the go')).toBeVisible();
  await expect(shelf.challengeCard()).toHaveCount(0);

  await startChallengeInDatabase({ readerIds: ['p-theo'] });
  await page.reload();
  await expect(page.getByText('On the go')).toBeVisible();
  await expect(shelf.challengeCard()).toHaveCount(0);
});
