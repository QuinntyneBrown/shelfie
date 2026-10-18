import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { expireSessions } from '../../../../e2e/support/database';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';

// Paced to the narration in script.md: sign in, reload, thirty quiet days pass, the signed-out note, carry on.
test('stay-signed-in', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.greeting().waitFor();
  await page.waitForTimeout(4000);
  await page.reload();
  await shelf.greeting().waitFor();
  await page.waitForTimeout(9000);

  expireSessions();
  await page.reload();
  const signIn = new SignInPage(page);
  await signIn.signedOutNotice().waitFor();
  await page.waitForTimeout(6000);
  await signIn.choose('Nia');
  await signIn.enterPin('1234');
  await shelf.greeting().waitFor();
  await page.waitForTimeout(3000);
});

// Paced to the narration in script.md: account menu, Sign out, the picker, the shelf is closed.
test('sign-out', async ({ page }) => {
  await signInAsNia(page);
  await page.waitForTimeout(2000);
  const shell = new ShellPage(page);
  await shell.accountMenuButton('Nia').hover();
  await page.waitForTimeout(1000);
  await shell.openAccountMenu('Nia');
  await page.waitForTimeout(1500);
  await shell.menuItem('Sign out').hover();
  await page.waitForTimeout(1000);
  await shell.menuItem('Sign out').click();
  await new SignInPage(page).pickerHeading().waitFor();
  await page.waitForTimeout(5000);
  await page.goto('/shelf');
  await page.waitForURL('**/sign-in');
  await page.waitForTimeout(4000);
});
