// Traces to: L2-010
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { BooksPage } from '../pages/books.page';
import { ShellPage } from '../pages/shell.page';
import { ErrorPage } from '../pages/error.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { ShelfPage } from '../pages/shelf.page';
import { readOnOf } from '../support/database';

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

test.describe('with no books', () => {
  test.use({ shelf: 'empty' });

  test('Given no books, when Dad opens Books, then an empty state offers Add a book', async ({ page }) => {
    await signInAsDad(page);
    const books = new BooksPage(page);
    await books.open();

    await expect(books.emptyState()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add a book' })).toHaveCount(2);
  });
});

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given Dad opens a book to manage, then he sees its logged chapters newest first and its details', async ({ page }) => {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage(LION);

  const manage = new ManageBookPage(page);
  await expect(manage.heading()).toHaveText(LION);
  const rows = manage.loggedChapters().getByRole('row');
  await expect(rows).toHaveCount(12);
  await expect(rows.nth(1)).toContainText('11');
  await expect(rows.nth(1)).toContainText('Father Christmas gave them presents.');
  await expect(rows.nth(1)).toContainText('To review');
  await expect(rows.nth(11)).toContainText('Lucy found a wardrobe');
  await expect(manage.title()).toHaveValue(LION);
  await expect(manage.author()).toHaveValue('C. S. Lewis');
  await expect(manage.chapters()).toHaveValue('17');
});

test('Given Dad changes a book’s details, when he saves, then Nia sees them on her shelf', async ({ page, browser, baseURL }) => {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage('Because of Winn-Dixie');
  const manage = new ManageBookPage(page);
  await manage.title().fill('Because of Winn Dixie');
  await manage.author().fill('K. DiCamillo');
  await manage.chapters().fill('14');
  await manage.save();
  await expect(manage.saved()).toBeVisible();

  const herDevice = await browser.newContext({ baseURL });
  const nia = await herDevice.newPage();
  await signInAsNia(nia);
  await expect(new ShelfPage(nia).book('Up next', 'Because of Winn Dixie')).toContainText('K. DiCamillo');
  await herDevice.close();
});

test('Given a book with 11 chapters logged, when Dad sets the count below 11, then an inline error shows and nothing is saved', async ({ page }) => {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage(LION);
  const manage = new ManageBookPage(page);
  manage.watchSaves();
  await manage.chapters().fill('10');
  await manage.save();

  await expect(manage.chapters()).toHaveAccessibleDescription(/Enter 11 or more\. Nia has already logged 11 chapters\./);
  expect(manage.saveRequestCount()).toBe(0);
});

test('Given a request that skips the page, when the count is below the logged chapters or Nia asks, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const manage = new ManageBookPage(page);

  const asReader = await manage.patchViaApi('b-lion', { title: 'Mine now' });
  expect(asReader.status()).toBe(403);

  await page.context().clearCookies();
  await signInAsDad(page);
  const tooFew = await manage.patchViaApi('b-lion', { chapterCount: 5 });
  const foreign = await manage.patchViaApi('b-other', { title: 'Not yours' });
  expect(tooFew.status()).toBe(400);
  expect(foreign.status()).toBe(404);
});

test('Given a book that is not in the family, when Dad opens its manage page, then he sees Not found', async ({ page }) => {
  await signInAsDad(page);
  await page.goto('/manage-book/b-other');

  await expect(new ErrorPage(page).heading()).toHaveText('We can’t find that page');
});

async function manageLion(page: import('@playwright/test').Page) {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage(LION);
  return new ManageBookPage(page);
}

test('Given Dad confirms Remove, then the book, its chapters and answers are gone and a toast says so', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.openRemoveDialog();
  await expect(manage.removeDialog()).toHaveAccessibleName(`Remove “${LION}”?`);
  await expect(manage.keepButton()).toBeFocused();
  await manage.confirmRemove();

  await expect(page).toHaveURL(/\/books$/);
  await expect(page.getByRole('status').getByText(`${LION} removed from the shelf`)).toBeVisible();
  await expect(new BooksPage(page).row(LION)).toHaveCount(0);
  expect(readOnOf('b-lion', 1)).toBeUndefined();
});

for (const how of ['Keep the book', 'Escape']) {
  test(`Given the Remove dialog, when Dad chooses ${how}, then nothing is deleted and focus returns to Remove book`, async ({ page }) => {
    const manage = await manageLion(page);
    await manage.openRemoveDialog();
    if (how === 'Escape') await manage.pressEscape();
    else await manage.keepButton().click();

    await expect(manage.removeDialog()).toBeHidden();
    await expect(manage.removeButton()).toBeFocused();
    expect(readOnOf('b-lion', 1)).toBeDefined();
  });
}

test('Given removing fails, when Dad confirms, then the dialog says so and the book stays', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.breakRemoving();
  await manage.openRemoveDialog();
  await manage.confirmRemove();

  await expect(manage.removeDialog()).toContainText('The book wasn’t removed');
  expect(readOnOf('b-lion', 1)).toBeDefined();
});

test('Given a delete that skips the page, when Nia asks or the book is another family’s, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const manage = new ManageBookPage(page);
  expect((await manage.deleteViaApi('b-lion')).status()).toBe(403);

  await page.context().clearCookies();
  await signInAsDad(page);
  expect((await manage.deleteViaApi('b-other')).status()).toBe(404);
});

test('Given a phone screen, when the Remove dialog opens, then it sits on the bottom edge as a sheet; on a wide screen it floats', async ({ page }) => {
  // Traces to: L2-025
  await page.setViewportSize({ width: 360, height: 800 });
  const manage = await manageLion(page);
  await manage.openRemoveDialog();
  expect(await manage.gapBelowDialog()).toBeLessThan(1);

  await manage.pressEscape();
  await page.setViewportSize({ width: 1280, height: 900 });
  await manage.openRemoveDialog();
  expect(await manage.gapBelowDialog()).toBeGreaterThan(40);
});
