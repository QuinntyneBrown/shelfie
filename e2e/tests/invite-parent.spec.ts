// Traces to: L2-034
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { inviteLinkFor, mailFor } from '../support/mailbox';
import { SettingsPage } from '../pages/settings.page';
import { InviteParentDialog } from '../pages/invite-parent-dialog.page';

const PRIYA = 'priya@example.com';

test('Given Dad invites Priya by e-mail, when he sends, then a link is mailed to her, the dialog confirms it and she is listed as invited', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await expect(dialog.heading()).toHaveText('Invite a parent');
  await dialog.send(PRIYA);

  await expect(dialog.heading()).toHaveText('Invite sent');
  await expect(dialog.confirmation()).toContainText(`We e-mailed ${PRIYA}.`);
  await expect.poll(() => mailFor(PRIYA).length).toBe(1);
  expect(inviteLinkFor(PRIYA)).toContain('/accept-invite?token=');
  await dialog.done();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.parent(PRIYA)).toContainText('Invited');
});

test('Given a malformed e-mail, when Dad sends, then the field says so and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.send('priya@');

  await expect(dialog.problemSummary()).toContainText('Fix 1 thing');
  await expect(dialog.emailField()).toHaveAccessibleDescription(/Enter a valid e-mail/);
  expect(dialog.requestCount()).toBe(0);
});

test('Given the invite cannot be sent, when Dad sends, then he is told, the address stays and Try again sends it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.breakSending();
  await dialog.send(PRIYA);

  await expect(dialog.failure()).toBeVisible();
  await expect(dialog.emailField()).toHaveValue(PRIYA);
  await dialog.repairSending();
  await dialog.tryAgain();

  await expect(dialog.heading()).toHaveText('Invite sent');
});

test('Given an address that already has an account, when Dad sends, then the field says so and no mail goes out', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.send('other@example.com');

  await expect(dialog.emailField()).toHaveAccessibleDescription(/That e-mail already has an account/);
  expect(mailFor('other@example.com').length).toBe(0);
});

test('Given a pending invite, when Dad chooses Send again, then a fresh link is mailed and Priya stays listed once', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.send(PRIYA);
  await dialog.done();
  const first = inviteLinkFor(PRIYA);

  await settings.sendInviteAgain(PRIYA);

  await expect(settings.toast(`Invite sent again to ${PRIYA}`)).toBeVisible();
  await expect.poll(() => mailFor(PRIYA).length).toBe(2);
  expect(inviteLinkFor(PRIYA)).not.toBe(first);
  await expect(settings.parent(PRIYA)).toHaveCount(1);
});
