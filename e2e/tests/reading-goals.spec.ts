// Traces to: L2-154, L2-155, L2-156, L2-157, L2-158, L2-159, L2-160, L2-161, L2-162
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia, signInAsZedsDad } from '../support/signed-in';
import { finishBook, householdDay, setReadingGoal } from '../support/database';
import { CommunitiesPage } from '../pages/communities.page';
import { CommunityPage } from '../pages/community.page';
import { JoinCommunityDialog } from '../pages/join-community-dialog.page';
import { ReadingGoalDialog } from '../pages/reading-goal-dialog.page';
import { RemoveReadingGoalDialog } from '../pages/remove-reading-goal-dialog.page';
import { ShelfPage } from '../pages/shelf.page';
import { StartCommunityDialog } from '../pages/start-community-dialog.page';

test('Given no reading goal, when Dad sets 2 books by next month, then the toast says so and Community shows 0 of 2; Nia sees it on her shelf', async ({ page }) => {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();

  await communities.setHouseholdGoal();
  await new ReadingGoalDialog(page).save(2, householdDay(30));

  await expect(communities.toast('Reading goal saved')).toBeVisible();
  await expect(communities.householdGoal()).toContainText('Our reading goal');
  await expect(communities.householdGoal()).toContainText('0 of 2');

  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.readingGoal('Our reading goal')).toContainText('0 of 2');
  await expect(shelf.readingGoal('Our reading goal').getByRole('button')).toHaveCount(0);
});

test('Given a target of 0, when Dad saves, then the dialog says what to fix and no goal is set', async ({ page }) => {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();
  await communities.setHouseholdGoal();
  const dialog = new ReadingGoalDialog(page);

  await dialog.save(0, householdDay(30));

  await expect(dialog.problemSummary()).toBeVisible();
  await expect(dialog.dialog()).toContainText('Choose 1 to 100 books.');
});

test('Given no reading goal, then Nia’s shelf has no Reading goals section and the reward gallery’s Reading toward is unchanged', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.greeting()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reading toward' })).toBeVisible();
  await expect(shelf.readingGoals()).toHaveCount(0);
});

test('Given Nia finishes the books of the goal, then her shelf celebrates once and the card says Reached', async ({ page }) => {
  await setReadingGoal(2, householdDay(-1), householdDay(30));
  await finishBook('b-lion');
  await finishBook('b-robot');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.readingGoal('Our reading goal')).toContainText('Reached');
  await expect(shelf.readingGoalCelebration()).toBeVisible();
  await expect(shelf.toast('Reading goal reached!')).toBeVisible();

  await page.reload();
  await expect(shelf.readingGoal('Our reading goal')).toContainText('Reached');
  await expect(shelf.toast('Reading goal reached!')).toHaveCount(0);
});

test('Given a goal whose end date passed short of its target, then it shows as Ended', async ({ page }) => {
  await setReadingGoal(5, householdDay(-20), householdDay(-2));
  await signInAsNia(page);

  await expect(new ShelfPage(page).readingGoal('Our reading goal')).toContainText('Ended');
});

test('Given a goal, when Dad edits it and then removes it, then the change shows and the goal is gone from Nia’s shelf', async ({ page }) => {
  await setReadingGoal(5, householdDay(-1), householdDay(30));
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();

  await communities.editHouseholdGoal();
  await new ReadingGoalDialog(page).save(3, householdDay(40));
  await expect(communities.householdGoal()).toContainText('0 of 3');

  await communities.removeHouseholdGoal();
  await new RemoveReadingGoalDialog(page).confirm();
  await expect(communities.householdGoal()).toContainText('No reading goal yet');

  await page.context().clearCookies();
  await signInAsNia(page);
  await expect(new ShelfPage(page).greeting()).toBeVisible();
  await expect(new ShelfPage(page).readingGoals()).toHaveCount(0);
});

test('Given Dad manages a community with a goal, when both families finish books, then the page adds them up per family, Nia sees the total, and Zed’s dad cannot change it', async ({ page }) => {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();
  await communities.startCommunity();
  await new StartCommunityDialog(page).start('Maple Street Readers', 'The Bells');
  const community = new CommunityPage(page);
  await community.setGoal();
  await new ReadingGoalDialog(page).save(5, householdDay(30));
  await expect(community.goal()).toContainText('0 of 5');
  const code = await community.joinCode();
  const id = community.id();
  await finishBook('b-lion');
  await finishBook('b-other');

  await page.context().clearCookies();
  await signInAsZedsDad(page);
  await communities.open();
  await communities.joinWithCode();
  await new JoinCommunityDialog(page).join(code, 'The Lins');
  await expect(community.goal()).toContainText('2 of 5');
  await expect(community.family('The Bells')).toContainText('1 book toward the goal');
  await expect(community.family('The Lins')).toContainText('1 book toward the goal');
  await expect(community.editGoalButton()).toHaveCount(0);

  await page.context().clearCookies();
  await signInAsNia(page);
  await expect(new ShelfPage(page).readingGoal('Maple Street Readers')).toContainText('2 of 5');
  await new CommunityPage(page).open(id);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This part is for grown-ups');
});
