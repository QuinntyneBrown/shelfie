import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { SettingsPage } from '../../../../e2e/pages/settings.page';
import { ShellPage } from '../../../../e2e/pages/shell.page';

// Paced to the narration in script.md: sign in and find Appearance, Always dark, reload, then Match the device.
test('choose-appearance', async ({ page }) => {
  const shell = new ShellPage(page);
  const settings = new SettingsPage(page);
  await shell.preferDarkDevice(false);
  await signInAsDad(page);
  await page.waitForTimeout(3000);
  await settings.open();
  await page.waitForTimeout(2000);
  await settings.appearanceChoice('Match the device').hover();
  await page.waitForTimeout(4000);

  await settings.appearanceChoice('Always dark').hover();
  await page.waitForTimeout(1000);
  await settings.chooseAppearance('Always dark');
  await settings.saveButton().hover();
  await settings.save();
  await settings.banner().waitFor();
  await page.waitForTimeout(3000);
  await page.reload();
  await settings.appearanceChoice('Always dark').hover();
  await page.waitForTimeout(7000);

  await settings.appearanceChoice('Match the device').hover();
  await page.waitForTimeout(1000);
  await settings.chooseAppearance('Match the device');
  await settings.saveButton().hover();
  await settings.save();
  await settings.banner().waitFor();
  await page.waitForTimeout(3000);
  await shell.preferDarkDevice(true);
  await page.waitForTimeout(5000);
  await shell.preferDarkDevice(false);
  await page.waitForTimeout(5000);
});
