import { test } from '../../../../tools/video-record/test';
import { rememberDevice } from '../../../../e2e/support/remember-device';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';

test.use({ viewport: { width: 390, height: 792 }, video: { mode: 'on', size: { width: 390, height: 792 } } });

// Paced to the narration in script.md: pick her name, a wrong PIN, then the right one and her shelf.
test('sign-in-with-pin', async ({ page }) => {
  await rememberDevice(page.context());
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.pickerHeading().waitFor();
  await page.waitForTimeout(10000);
  await signIn.choose('Nia');
  await page.waitForTimeout(9000);

  await signIn.enterPin('9999');
  await signIn.pinError().waitFor();
  await page.waitForTimeout(12000);

  await signIn.digitButton('1').hover();
  await page.waitForTimeout(1500);
  await signIn.enterPin('1234');
  await page.waitForURL('**/shelf');
  await new ShelfPage(page).greeting().waitFor();
  await page.waitForTimeout(9000);
});
