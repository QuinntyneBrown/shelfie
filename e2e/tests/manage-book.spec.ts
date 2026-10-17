// Traces to: L2-010
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { BooksPage } from '../pages/books.page';
import { ShellPage } from '../pages/shell.page';
import { ErrorPage } from '../pages/error.page';

test('Given Dad opens Books from the top bar, then every book shows its progress and status with a Manage link', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await shell.topNav().getByRole('link', { name: 'Books' }).click();

  const books = new BooksPage(page);
  await expect(books.heading()).toHaveText('Books');
  await expect(books.row('The Lion, the Witch and the Wardrobe')).toContainText('11 of 17 chapters');
  await expect(books.row('The Lion, the Witch and the Wardrobe')).toContainText('Reading');
  await expect(books.row('Because of Winn-Dixie')).toContainText('Not started');
  await expect(books.row('Matilda')).toContainText('Reward to give');
  await expect(books.row('Charlotte’s Web')).toContainText('Rewarded');
  await expect(books.row('Charlotte’s Web')).toContainText('Movie night with popcorn');
  await expect(books.addBookLink()).toBeVisible();
});

test('Given a phone screen, when Dad is signed in, then the bottom tab bar replaces the top links', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInAsDad(page);
  const shell = new ShellPage(page);

  await expect(shell.tabBar().getByRole('link', { name: 'Review' })).toBeVisible();
  await expect(shell.tabBar().getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(shell.topNav()).toBeHidden();
  await shell.tabBar().getByRole('link', { name: 'Books' }).click();
  await expect(new BooksPage(page).heading()).toHaveText('Books');
  await expect(shell.tabBar().getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page');
});

test('Given Nia is signed in, then she has no grown-up navigation and Books is for grown-ups only', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAsNia(page);
  const books = new BooksPage(page);

  const response = await books.getViaApi();
  await books.open();

  expect(response.status()).toBe(403);
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
  await expect(new ShellPage(page).topNav()).toBeHidden();
});
