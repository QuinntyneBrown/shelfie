import type { Page } from '@playwright/test';
import { SignInPage } from '../pages/sign-in.page';
import { DAD, NIA, THEO, ZEDS_DAD } from './accounts';

/** Signs Nia in through the sign-in page, ending on her shelf. */
export async function signInAsNia(page: Page) {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(NIA.username, NIA.password);
  await page.waitForURL('**/shelf');
}

/** Signs Dad in with his username and password, ending on Review. */
export async function signInAsDad(page: Page) {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await page.waitForURL('**/review');
}

/** Signs Theo, the second reader `addTheo()` adds, in, ending on his shelf. */
export async function signInAsTheo(page: Page) {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(THEO.username, THEO.password);
  await page.waitForURL('**/shelf');
}

/** Signs Zed’s dad, the parent of the second seeded household, in, ending on Review. */
export async function signInAsZedsDad(page: Page) {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(ZEDS_DAD.username, ZEDS_DAD.password);
  await page.waitForURL('**/review');
}
