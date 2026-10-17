// Traces to: L2-001
import { test, expect } from '../support/test';
import { SignInPage } from '../pages/sign-in.page';
import { ShelfPage } from '../pages/shelf.page';
import { giveDeviceCookie } from '../support/device-cookie';

test.beforeEach(async ({ context }) => {
  await giveDeviceCookie(context);
});

test('Given the device knows the household, when Nia enters her correct PIN, then she is taken to her shelf', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.enterPin('1234');

  await expect(page).toHaveURL(/\/shelf$/);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

test('Given Nia has chosen her profile, when she enters a wrong PIN, then an inline error shows and the keypad is cleared', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.enterPin('9999');

  await expect(signIn.pinError()).toHaveText('That PIN didn’t match. 4 tries left.');
  await expect(signIn.digitsEntered(0)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});
