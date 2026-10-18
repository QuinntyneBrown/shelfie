// Traces to: L2-001
import { test, expect } from '../support/test';
import { SignInPage } from '../pages/sign-in.page';
import { ShelfPage } from '../pages/shelf.page';
import { rememberDevice } from '../support/remember-device';

test.beforeEach(async ({ context }) => {
  await rememberDevice(context);
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

test('Given the PIN keypad is showing, when she types letters and digits, then only digits count and the last can be deleted', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.typePin('a1?2');

  await expect(signIn.digitsEntered(2)).toBeVisible();
  await signIn.deleteLastDigit();
  await expect(signIn.digitsEntered(1)).toBeVisible();
});

test('Given Nia has chosen her profile, when the keypad shows, then every digit key is the same round size', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');

  const sizes = await signIn.digitKeySizes();
  for (const size of sizes) expect(size).toEqual({ width: sizes[0].height, height: sizes[0].height });
});

test('Given Nia has entered five wrong PINs, when the fifth fails, then the keypad locks for 5 minutes and shows the time left', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.failPin(5);

  await expect(signIn.lockNotice()).toContainText('locked for 5 minutes');
  await expect(signIn.lockNotice()).toContainText(/Try again in [45]:\d\d/);
  await expect(signIn.digitButton('1')).toBeDisabled();
});

test('Given Nia is locked out, when the correct PIN is sent, then it is refused', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.failPin(5);

  const response = await signIn.postPin('Nia', '1234');
  expect(response.status()).toBe(423);
  expect((await response.json()).type).toBe('pin-locked');
});
