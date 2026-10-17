// Traces to: L2-021, L2-005
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SettingsPage } from '../pages/settings.page';
import { ErrorPage } from '../pages/error.page';

test('Given Dad is signed in, when he chooses Settings from his account menu, then the page shows how the household is set up now', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await shell.menuItem('Settings').click();

  const settings = new SettingsPage(page);
  await expect(settings.heading()).toHaveText('Settings');
  await expect(settings.readerName()).toHaveValue('Nia');
  await expect(settings.grownUpName()).toHaveValue('Dad');
  await expect(settings.email()).toHaveValue('dad@example.com');
});

test('Given Nia is signed in, when she opens Settings, then it is for grown-ups only, on the page and in the API', async ({ page }) => {
  await signInAsNia(page);
  const settings = new SettingsPage(page);

  const response = await settings.getViaApi();
  await page.goto('/settings');

  expect(response.status()).toBe(403);
  expect((await response.json()).type).toBe('grown-ups-only');
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
});

test('Given nobody is signed in, when the settings are asked for, then the API says 401', async ({ page }) => {
  const response = await new SettingsPage(page).getViaApi();

  expect(response.status()).toBe(401);
});
