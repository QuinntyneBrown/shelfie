import type { Page } from '@playwright/test';
import { signInAsDad, signInAsNia } from './signed-in';
import { rememberDevice } from './remember-device';
import { ErrorPage } from '../pages/error.page';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';
import { SignInPage } from '../pages/sign-in.page';

export interface Screen {
  name: string;
  /** Takes the page from a blank browser to this screen, fully loaded. */
  open: (page: Page) => Promise<void>;
}

/** Every screen built so far, for checks that must hold on all of them. */
export const screens: Screen[] = [
  {
    name: 'sign-in profile picker',
    open: async (page) => {
      await rememberDevice(page.context());
      const signIn = new SignInPage(page);
      await signIn.open();
      await signIn.pickerHeading().waitFor();
    },
  },
  {
    name: 'sign-in PIN keypad',
    open: async (page) => {
      await rememberDevice(page.context());
      const signIn = new SignInPage(page);
      await signIn.open();
      await signIn.choose('Nia');
    },
  },
  {
    name: 'sign-in password form',
    open: async (page) => {
      const signIn = new SignInPage(page);
      await signIn.open();
      await signIn.emailField().waitFor();
    },
  },
  {
    name: 'shelf',
    open: async (page) => {
      await signInAsNia(page);
      await new ShelfPage(page).group('Finished').waitFor();
    },
  },
  {
    name: 'log a chapter',
    open: async (page) => {
      await signInAsNia(page);
      await new ShelfPage(page).logChapter('On the go', 'The Wild Robot', 4);
      await page.getByRole('button', { name: 'I’m done!' }).waitFor();
    },
  },
  {
    name: 'grown-ups only',
    open: async (page) => {
      await signInAsNia(page);
      await page.goto('/review');
      await new ErrorPage(page).heading().waitFor();
    },
  },
  {
    name: 'not found',
    open: async (page) => {
      await signInAsNia(page);
      await page.goto('/no/such/page');
      await new ErrorPage(page).heading().waitFor();
    },
  },
  {
    name: 'review',
    open: async (page) => {
      await signInAsDad(page);
    },
  },
  {
    name: 'settings',
    open: async (page) => {
      await signInAsDad(page);
      await page.goto('/settings');
      await new SettingsPage(page).readerName().waitFor();
    },
  },
];
