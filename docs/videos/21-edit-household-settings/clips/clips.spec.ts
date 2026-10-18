import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { SettingsPage } from '../../../../e2e/pages/settings.page';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';

// Paced to the narration in script.md: open Settings, Mint and a new PIN, Saved,
// then Switch reader: the old PIN fails and the new one opens Nia's shelf.
test('change-colour-and-pin', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await shell.accountMenuButton('Dad').hover();
  await page.waitForTimeout(1000);
  await shell.openAccountMenu('Dad');
  await page.waitForTimeout(1000);
  await shell.menuItem('Settings').hover();
  await shell.menuItem('Settings').click();

  const settings = new SettingsPage(page);
  await settings.readerName().waitFor();
  await page.waitForTimeout(6000);
  await settings.chooseReaderColour('Mint');
  await page.waitForTimeout(1500);
  await settings.pinField().pressSequentially('4321', { delay: 200 });
  await page.waitForTimeout(3000);
  await settings.save();
  await settings.banner().waitFor();
  await page.waitForTimeout(5000);

  await shell.openAccountMenu('Dad');
  await page.waitForTimeout(800);
  await shell.menuItem('Switch reader').click();
  const signIn = new SignInPage(page);
  await signIn.choose('Nia');
  await page.waitForTimeout(1000);
  await signIn.enterPin('1234');
  await signIn.pinError().waitFor();
  await page.waitForTimeout(2500);
  await signIn.enterPin('4321');
  await new ShelfPage(page).greeting().waitFor();
  await shell.accountMenuButton('Nia').hover();
  await page.waitForTimeout(4000);
});
