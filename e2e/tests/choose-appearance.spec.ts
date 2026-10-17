// Traces to: L2-022
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { SettingsPage } from '../pages/settings.page';
import { ShellPage } from '../pages/shell.page';

test('Given the household chose Match the device, when the device is dark, then the app is dark, and light when the device is light', async ({ page }) => {
  const shell = new ShellPage(page);
  await shell.preferDarkDevice(true);
  await signInAsDad(page);
  await expect.poll(() => shell.theme()).toBe('dark');

  await shell.preferDarkDevice(false);
  await expect.poll(() => shell.theme()).toBe('light');
});

test('Given Dad chooses Always dark on a light device, when he saves, then the app turns dark at once and stays dark after a reload', async ({ page }) => {
  const shell = new ShellPage(page);
  await shell.preferDarkDevice(false);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.chooseAppearance('Always dark');
  await settings.save();

  await expect.poll(() => shell.theme()).toBe('dark');
  await page.reload();
  await expect.poll(() => shell.theme()).toBe('dark');
});

test('Given Dad chooses Always light on a dark device, when he saves, then the app stays light', async ({ page }) => {
  const shell = new ShellPage(page);
  await shell.preferDarkDevice(true);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.chooseAppearance('Always light');
  await settings.save();

  await expect.poll(() => shell.theme()).toBe('light');
});

test('Given Dad chose Always dark, when Nia signs in on another device, then she sees dark too', async ({ page, baseURL }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.chooseAppearance('Always dark');
  await settings.save();
  await expect.poll(() => new ShellPage(page).theme()).toBe('dark');

  const otherDevice = await page.context().browser()!.newContext({ baseURL, colorScheme: 'light' });
  const nia = await otherDevice.newPage();
  await signInAsNia(nia);

  await expect.poll(() => new ShellPage(nia).theme()).toBe('dark');
  await otherDevice.close();
});
