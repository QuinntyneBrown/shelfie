// Traces to: L2-025, L2-026
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
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
