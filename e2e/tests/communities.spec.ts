// Traces to: L2-145, L2-146, L2-147, L2-148, L2-149, L2-151, L2-152, L2-153, L2-162
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia, signInAsZedsDad } from '../support/signed-in';
import { CommunitiesPage } from '../pages/communities.page';
import { CommunityPage } from '../pages/community.page';
import { ErrorPage } from '../pages/error.page';
import { JoinCommunityDialog } from '../pages/join-community-dialog.page';
import { LeaveCommunityDialog } from '../pages/leave-community-dialog.page';
import { ShellPage } from '../pages/shell.page';
import { StartCommunityDialog } from '../pages/start-community-dialog.page';
import type { Page } from '@playwright/test';

/** Dad starts Maple Street Readers as The Bells and returns its page's code and id. */
async function dadStartsACommunity(page: Page) {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await new ShellPage(page).navLink('top', 'Community').click();
  await communities.startCommunity();
  await new StartCommunityDialog(page).start('Maple Street Readers', 'The Bells');
  const community = new CommunityPage(page);
  await expect(community.heading()).toHaveText('Maple Street Readers');
  return { code: await community.joinCode(), id: community.id() };
}

test('Given no community, when Dad opens Community, then it offers to start one or join with a code', async ({ page }) => {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);

  await new ShellPage(page).navLink('top', 'Community').click();

  await expect(communities.heading()).toHaveText('Community');
  await expect(communities.emptyState()).toBeVisible();
  await expect(communities.householdGoal()).toContainText('No reading goal yet');
});

test('Given Dad starts a community, then its page shows its name, an 8-character code, the Bells as its only family, and Community lists it', async ({ page }) => {
  const { code } = await dadStartsACommunity(page);
  const community = new CommunityPage(page);

  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(community.families()).toHaveCount(1);
  await expect(community.family('The Bells')).toContainText('You');

  const communities = new CommunitiesPage(page);
  await communities.open();
  await expect(communities.community('Maple Street Readers')).toContainText('1 family');
});

test('Given an empty name, when Dad starts a community, then the dialog says what to fix and nothing is started', async ({ page }) => {
  await signInAsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();
  await communities.startCommunity();
  const dialog = new StartCommunityDialog(page);

  await dialog.start('   ', 'The Bells');

  await expect(dialog.problemSummary()).toBeVisible();
  await expect(dialog.nameError()).toBeVisible();
});

test('Given Dad’s code, when Zed’s dad types it in lower case and joins, then both families see the community and each other, and the toast says so', async ({ page }) => {
  const { code } = await dadStartsACommunity(page);
  await page.context().clearCookies();
  await signInAsZedsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();

  await communities.joinWithCode();
  await new JoinCommunityDialog(page).join(code.toLowerCase(), 'The Lins');

  const community = new CommunityPage(page);
  await expect(community.heading()).toHaveText('Maple Street Readers');
  await expect(community.toast('Joined Maple Street Readers')).toBeVisible();
  await expect(community.families()).toHaveCount(2);
  await expect(community.family('The Lins')).toContainText('You');
  await expect(community.family('The Bells')).not.toContainText('You');
});

test('Given a wrong code or Dad’s own community, when he tries to join, then the dialog says why and he can open the one he is in', async ({ page }) => {
  const { code } = await dadStartsACommunity(page);
  const communities = new CommunitiesPage(page);
  const dialog = new JoinCommunityDialog(page);
  await communities.open();

  await communities.joinWithCode();
  await dialog.join('ZZZZ-ZZZZ', 'The Bells');
  await expect(dialog.codeError()).toHaveText('No community has that code. Check it with the parent who gave it to you.');

  await dialog.join(code, 'The Bells');
  await expect(dialog.codeError()).toHaveText('Your family is already in Maple Street Readers.');
  await dialog.openCommunity();
  await expect(new CommunityPage(page).heading()).toHaveText('Maple Street Readers');
});

test('Given Zed’s family joined, when Zed’s dad leaves, then the toast says so, Community no longer lists it and Dad sees only the Bells', async ({ page }) => {
  const { code, id } = await dadStartsACommunity(page);
  await page.context().clearCookies();
  await signInAsZedsDad(page);
  const communities = new CommunitiesPage(page);
  await communities.open();
  await communities.joinWithCode();
  await new JoinCommunityDialog(page).join(code, 'The Lins');
  const community = new CommunityPage(page);
  await expect(community.families()).toHaveCount(2);

  await community.leave();
  await new LeaveCommunityDialog(page).confirm();

  await expect(communities.toast('You left Maple Street Readers')).toBeVisible();
  await expect(communities.emptyState()).toBeVisible();
  await community.open(id);
  await expect(community.notFound()).toBeVisible();

  await page.context().clearCookies();
  await signInAsDad(page);
  await community.open(id);
  await expect(community.families()).toHaveCount(1);
});

test('Given Nia, then she has no Community link and the Community pages are for grown-ups only', async ({ page }) => {
  const { id } = await dadStartsACommunity(page);
  await page.context().clearCookies();
  await signInAsNia(page);

  await expect(page.getByRole('link', { name: 'Community' })).toHaveCount(0);
  await new CommunitiesPage(page).open();
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
  await new CommunityPage(page).open(id);
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
});

test('Given a community Zed’s family is not in, when Zed’s dad opens its page, then he is told it can’t be found and sees nothing of it', async ({ page }) => {
  const { id } = await dadStartsACommunity(page);
  await page.context().clearCookies();
  await signInAsZedsDad(page);
  const community = new CommunityPage(page);

  await community.open(id);

  await expect(community.notFound()).toBeVisible();
  await expect(page.getByText('Maple Street Readers')).toHaveCount(0);
  await expect(page.getByText('The Bells')).toHaveCount(0);
});

test('Given the community page, when Dad presses Copy code, then the code is on the clipboard and the button says Copied!', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { code } = await dadStartsACommunity(page);
  const community = new CommunityPage(page);

  await community.copyCode();

  await expect(community.copiedButton()).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
});
