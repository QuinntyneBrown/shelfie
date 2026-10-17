// Traces to: L2-025, L2-026
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SignInPage } from '../pages/sign-in.page';

test('Given Nia is signed in, when her shelf shows, then the top bar has the brand and her account menu', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await expect(shell.brand()).toBeVisible();
  await expect(shell.accountMenuButton('Nia')).toBeVisible();
  await expect(shell.main()).toHaveCount(1);
});

test('Given nobody is signed in, when the sign-in page shows, then there is no top bar', async ({ page }) => {
  await new SignInPage(page).open();

  await expect(new ShellPage(page).accountMenuButton('Nia')).toBeHidden();
});

test('Given a keyboard user opens a page, when she presses Tab then Enter, then the skip link jumps to the main content', async ({ page }) => {
  await signInAsNia(page);
  await page.reload();
  const shell = new ShellPage(page);
  await expect(shell.accountMenuButton('Nia')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(shell.skipLink()).toBeFocused();
  await expect(shell.skipLink()).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(shell.main()).toBeFocused();
});

test('Given Nia moves to another page, when it shows, then keyboard focus is on its main content rather than lost', async ({ page }) => {
  await signInAsNia(page);

  await expect(new ShellPage(page).main()).toBeFocused();
});

test('Given Nia opens her account menu, then it names her and offers Switch reader and Sign out, and Escape closes it back to the avatar', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Nia');
  await expect(shell.menu()).toContainText('Nia · Reader');
  await expect(shell.menuItem('Switch reader')).toBeVisible();
  await expect(shell.menuItem('Sign out')).toBeVisible();
  await expect(shell.menuItem('Settings')).toBeHidden();

  await shell.press('Escape');
  await expect(shell.menu()).toBeHidden();
  await expect(shell.accountMenuButton('Nia')).toBeFocused();
});

test('Given the avatar has keyboard focus, when ArrowDown is pressed, then the menu opens on its first item and the arrow keys move and wrap', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.focusAccountMenuButton('Nia');
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Switch reader')).toBeFocused();
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Sign out')).toBeFocused();
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Switch reader')).toBeFocused();
  await shell.press('ArrowUp');
  await expect(shell.menuItem('Sign out')).toBeFocused();
  await shell.press('Home');
  await expect(shell.menuItem('Switch reader')).toBeFocused();
  await shell.press('End');
  await expect(shell.menuItem('Sign out')).toBeFocused();
});

test('Given the avatar has keyboard focus, when Enter or Space is pressed, then the menu opens', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.focusAccountMenuButton('Nia');
  await shell.press('Enter');
  await expect(shell.menu()).toBeVisible();
  await shell.press('Escape');
  await shell.press('Space');
  await expect(shell.menu()).toBeVisible();
});

test('Given the menu is open, when she clicks elsewhere, then it closes', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Nia');
  await shell.clickOutsideMenu();

  await expect(shell.menu()).toBeHidden();
});

for (const item of ['Sign out', 'Switch reader']) {
  test(`Given Nia is signed in, when she chooses ${item}, then her session ends and she sees the profile picker`, async ({ page }) => {
    await signInAsNia(page);
    const shell = new ShellPage(page);

    await shell.openAccountMenu('Nia');
    await shell.menuItem(item).click();

    await expect(new SignInPage(page).pickerHeading()).toBeVisible();
    await page.goto('/shelf');
    await expect(page).toHaveURL(/\/sign-in$/);
  });
}

test('Given Dad is signed in, when he opens his account menu, then it shows his e-mail and offers Switch reader and Sign out', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Dad');

  await expect(shell.menu()).toContainText('dad@example.com');
  await expect(shell.menuItem('Sign out')).toBeVisible();
});
