import type { Page } from '@playwright/test';
import { SignInPage } from '../pages/sign-in.page';
import { JoinPage } from '../pages/join.page';
import { DAD, NIA, ROSA, SAM } from './accounts';

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

/** Rosa joins as an author through the Join page, ending on My profile. */
export async function joinAsRosa(page: Page) {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseAuthor();
  await join.fill(ROSA);
  await join.submit();
  await page.waitForURL('**/me');
}

/** Sam joins as a reading volunteer through the Join page, ending on My profile. */
export async function joinAsSam(page: Page) {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseVolunteer();
  await join.fill(SAM);
  await join.submit();
  await page.waitForURL('**/me');
}
