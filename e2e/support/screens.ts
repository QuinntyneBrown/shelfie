import type { Page } from '@playwright/test';
import { signInAsDad, signInAsNia } from './signed-in';
import { ErrorPage } from '../pages/error.page';
import { AddBookPage } from '../pages/add-book.page';
import { BooksPage } from '../pages/books.page';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';
import { SignInPage } from '../pages/sign-in.page';
import { SignUpPage } from '../pages/sign-up.page';

export interface Screen {
  name: string;
  /** Takes the page from a blank browser to this screen, fully loaded. */
  open: (page: Page) => Promise<void>;
}

/** Waits for the entrance animations to finish, so a card is measured at rest; the logo bobs forever and is left alone. */
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)),
  );
}

/** Every screen built so far, for checks that must hold on all of them. */
export const screens: Screen[] = [
  {
    name: 'sign-in',
    open: async (page) => {
      const signIn = new SignInPage(page);
      await signIn.open();
      await signIn.usernameField().waitFor();
      await settled(page);
    },
  },
  {
    name: 'sign-up',
    open: async (page) => {
      const signUp = new SignUpPage(page);
      await signUp.open();
      await signUp.nameField().waitFor();
      await settled(page);
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
      await new SettingsPage(page).yourName().waitFor();
    },
  },
  {
    name: 'add a book',
    open: async (page) => {
      await signInAsNia(page);
      const add = new AddBookPage(page);
      await add.open();
      await add.titleField().waitFor();
    },
  },
  {
    name: 'books list',
    open: async (page) => {
      await signInAsDad(page);
      await page.goto('/books');
      await new BooksPage(page).heading().waitFor();
    },
  },
  {
    name: 'manage a book',
    open: async (page) => {
      await signInAsDad(page);
      await page.goto('/manage-book/b-lion');
      await page.getByRole('button', { name: 'Remove book', exact: true }).waitFor();
    },
  },
  {
    name: 'chapter answers',
    open: async (page) => {
      await signInAsNia(page);
      await page.goto('/chapter-logs/b-lion-c10');
      await page.getByRole('heading', { name: 'Chapter 10' }).waitFor();
    },
  },
  {
    name: 'review a chapter',
    open: async (page) => {
      await signInAsDad(page);
      await page.goto('/review/chapters/b-lion-c11');
      await page.getByRole('button', { name: 'Send to Nia' }).waitFor();
    },
  },
  {
    name: 'give a reward dialog',
    open: async (page) => {
      await signInAsDad(page);
      await page.getByRole('button', { name: 'Give a reward' }).click();
      // Measure the dialog at rest, not part-way through its opening animation.
      await page.getByRole('dialog').evaluate((dialog) => Promise.all(dialog.getAnimations({ subtree: true }).map((a) => a.finished)));
    },
  },
];
