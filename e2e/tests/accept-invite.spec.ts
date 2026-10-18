// Traces to: L2-035
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { inviteLinkFor } from '../support/mailbox';
import { expireInvites } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { InviteParentDialog } from '../pages/invite-parent-dialog.page';
import { AcceptInvitePage } from '../pages/accept-invite.page';
import { SignInPage } from '../pages/sign-in.page';
import { ShellPage } from '../pages/shell.page';

const PRIYA = { email: 'priya@example.com', name: 'Priya', username: 'priya', password: 'bookworm-2026' };

/** Dad sends Priya an invite and signs out; returns the link from her mail. */
async function invitePriya(page: Parameters<typeof signInAsDad>[0]) {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.send(PRIYA.email);
  await dialog.done();
  await settings.signOut();
  return inviteLinkFor(PRIYA.email);
}

test('Given a valid invite link, when Priya opens it and joins, then she becomes a parent in Dad’s household and lands on Review', async ({ page }) => {
  const link = await invitePriya(page);
  const accept = new AcceptInvitePage(page);
  await accept.openLink(link);

  await expect(accept.heading()).toHaveText('Join Dad’s household');
  await expect(accept.invitedBy()).toHaveText('Dad invited you.');
  await expect(accept.emailField()).toHaveValue(PRIYA.email);
  await expect(accept.emailField()).toHaveAttribute('readonly');
  await accept.join(PRIYA);

  await expect(page).toHaveURL(/\/review$/);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Priya');
  await expect(shell.menu()).toContainText('@priya · parent');
  await shell.menuItem('Settings').click();
  const settings = new SettingsPage(page);
  await expect(settings.parent('Priya')).toContainText('You · @priya');
  await expect(settings.parent('Dad')).toContainText('@dad');
  await expect(settings.parent('Invited')).toHaveCount(0);
  await expect(settings.reader('Nia')).toBeVisible();
});

test('Given an invite link that has been used, when it is opened again, then it says the invite has expired and offers the way back', async ({ page }) => {
  const link = await invitePriya(page);
  const accept = new AcceptInvitePage(page);
  await accept.openLink(link);
  await accept.join(PRIYA);
  await expect(page).toHaveURL(/\/review$/);
  await new SettingsPage(page).open();
  await new SettingsPage(page).signOut();

  await accept.openLink(link);

  await expect(accept.heading()).toHaveText('This invite has expired');
  await expect(page.getByText('Ask Dad for a new one.')).toBeVisible();
  await accept.backToSignIn();
  await expect(new SignInPage(page).heading()).toHaveText('Welcome back');
});

test('Given an invite link older than 7 days, when it is opened, then it says the invite has expired', async ({ page }) => {
  const link = await invitePriya(page);
  await expireInvites();
  const accept = new AcceptInvitePage(page);
  await accept.openLink(link);

  await expect(accept.heading()).toHaveText('This invite has expired');
});

test('Given a taken username, a bad username, or passwords that are short or differ, when Priya joins, then inline errors show and nothing is created', async ({ page }) => {
  const link = await invitePriya(page);
  const accept = new AcceptInvitePage(page);
  await accept.openLink(link);

  await accept.join({ ...PRIYA, username: 'pr!ya', password: 'short', confirm: 'shorter' });
  await expect(accept.problemSummary()).toContainText('Fix 3 things');
  await expect(accept.usernameField()).toHaveAccessibleDescription(/Letters, numbers, \. and _ only/);
  await expect(accept.passwordField()).toHaveAccessibleDescription(/At least 8 characters/);
  await expect(accept.confirmField()).toHaveAccessibleDescription(/These don’t match/);
  expect(accept.requestCount()).toBe(0);

  await accept.join({ ...PRIYA, username: 'Nia' });
  await expect(accept.problemSummary()).toContainText('Fix 1 thing');
  await expect(accept.usernameField()).toHaveAccessibleDescription(/That username is taken/);
  await expect(page).toHaveURL(/\/accept-invite/);

  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(PRIYA.username, PRIYA.password);
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');
});
