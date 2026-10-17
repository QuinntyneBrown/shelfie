import type { Page } from '@playwright/test';
import { SignInPage } from '../pages/sign-in.page';
import { rememberDevice } from './remember-device';

/** Signs Nia in through the sign-in page, ending on her shelf. */
export async function signInAsNia(page: Page) {
  await rememberDevice(page.context());
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.enterPin('1234');
  await page.waitForURL('**/shelf');
}
