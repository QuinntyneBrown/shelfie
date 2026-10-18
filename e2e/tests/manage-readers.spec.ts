// Traces to: L2-036
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { NIA } from '../support/accounts';
import { SettingsPage } from '../pages/settings.page';
import { EditReaderDialog } from '../pages/edit-reader-dialog.page';
import { SignInPage } from '../pages/sign-in.page';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';

const THEO = { name: 'Theo', colour: 'Mint', username: 'theo', password: 'dragons-rule-9' };

test('Given Dad adds a reader, when he saves, then Theo is listed with his username and can sign in to his own shelf', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addReader();
  const dialog = new EditReaderDialog(page);
  await expect(dialog.heading()).toHaveText('Add a reader');
  await dialog.fill(THEO);
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Theo added')).toBeVisible();
  await expect(settings.reader('Theo')).toContainText('@theo');

  await settings.signOut();
  const signIn = new SignInPage(page);
  await signIn.signInWithPassword(THEO.username, THEO.password);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Theo');
  await expect(new ShellPage(page).accountMenuButton('Theo')).toHaveClass(/avatar--mint/);
});

test('Given Dad edits Nia’s name and colour, when he saves, then the list and her next sign-in show them', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.editReader('Nia');
  const dialog = new EditReaderDialog(page);
  await expect(dialog.heading()).toHaveText('Edit Nia');
  await expect(dialog.usernameField()).toHaveValue('nia');
  await dialog.fill({ name: 'Nina', colour: 'Sun' });
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.reader('Nina')).toContainText('@nia');

  await settings.signOut();
  await new SignInPage(page).signInWithPassword(NIA.username, NIA.password);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nina');
  await expect(new ShellPage(page).accountMenuButton('Nina')).toHaveClass(/avatar--sun/);
});

test('Given Dad sets a new password for Nia, when he saves, then only the new password signs her in', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.editReader('Nia');
  const dialog = new EditReaderDialog(page);
  await dialog.fill({ password: 'new-secret-12' });
  await dialog.save();
  await expect(dialog.dialog()).toBeHidden();

  await settings.signOut();
  const signIn = new SignInPage(page);
  await signIn.signInWithPassword(NIA.username, NIA.password);
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');
  await signIn.signInWithPassword(NIA.username, 'new-secret-12');
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

test('Given an empty name, a bad username and a short password, when Dad saves, then each field says what to fix and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addReader();
  const dialog = new EditReaderDialog(page);
  await dialog.fill({ name: '', username: 'th eo', password: 'short' });
  await dialog.save();

  await expect(dialog.problemSummary()).toContainText('Fix 3 things');
  await expect(dialog.nameField()).toHaveAccessibleDescription(/Enter a name/);
  await expect(dialog.usernameField()).toHaveAccessibleDescription(/Letters, numbers, \. and _ only/);
  await expect(dialog.passwordField()).toHaveAccessibleDescription(/At least 8 characters/);
  expect(dialog.requestCount()).toBe(0);
});

test('Given a username Dad already uses, in another case, when a reader is saved with it, then the field says it is taken and nothing is saved', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addReader();
  const dialog = new EditReaderDialog(page);
  await dialog.fill({ ...THEO, username: 'DAD' });
  await dialog.save();

  await expect(dialog.problemSummary()).toContainText('Fix 1 thing');
  await expect(dialog.usernameField()).toHaveAccessibleDescription(/That username is taken/);
  await expect(dialog.nameField()).toHaveValue('Theo');
  await dialog.cancel();
  await expect(settings.reader('Theo')).toBeHidden();
});

test('Given the server cannot be reached, when Dad saves a reader, then the dialog says nothing changed, keeps the values and Try again saves', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addReader();
  const dialog = new EditReaderDialog(page);
  await dialog.breakSaving();
  await dialog.fill(THEO);
  await dialog.save();

  await expect(dialog.failure()).toContainText('Theo wasn’t added');
  await expect(dialog.failure()).toContainText('Nothing changed.');
  await expect(dialog.usernameField()).toHaveValue('theo');
  await dialog.repairSaving();
  await dialog.tryAgain();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.reader('Theo')).toBeVisible();
});
