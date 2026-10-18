import { test, CURSOR } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';

// Paced to "On a desktop": the top bar, its three places, then the account menu.
test('navigate-on-a-desktop', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await page.waitForTimeout(2500);
  await shell.brand().hover();
  await page.waitForTimeout(2500);
  await shell.navLink('top', 'Review').hover();
  await page.waitForTimeout(3000);
  for (const place of ['Books', 'Settings', 'Review'] as const) {
    await shell.navLink('top', place).hover();
    await shell.navLink('top', place).click();
    await page.waitForTimeout(2500);
  }
  await shell.accountMenuButton('Dad').hover();
  await shell.openAccountMenu('Dad');
  await page.waitForTimeout(4500);
  await shell.press('Escape');
  await page.waitForTimeout(2000);
});

// Paced to "On a phone": the bottom tab bar's three places.
// The recording size is fixed per file, and the desktop clip above needs the wide one, so this clip
// records its own 390px-wide context and saves it where the builder looks: <test output>/video.webm.
test('navigate-on-a-phone', async ({ browser, baseURL }, testInfo) => {
  const size = { width: 390, height: 792 };
  const phone = await browser.newContext({ baseURL, viewport: size, recordVideo: { dir: testInfo.outputPath('raw'), size } });
  await phone.addInitScript(CURSOR);
  const page = await phone.newPage();
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await page.waitForTimeout(3000);
  for (const place of ['Books', 'Settings', 'Review'] as const) {
    await shell.navLink('tab', place).hover();
    await shell.navLink('tab', place).click();
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3000);
  await phone.close();
  await page.video()!.saveAs(testInfo.outputPath('video.webm'));
});
