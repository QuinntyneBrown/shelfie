// Traces to: L2-005
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ErrorPage } from '../pages/error.page';
import { ShelfPage } from '../pages/shelf.page';
import { SignInPage } from '../pages/sign-in.page';
import { LogChapterPage } from '../pages/log-chapter.page';

test('Given Nia is signed in, when she opens Review by URL, then she is told it is for grown-ups and can go back', async ({ page }) => {
  await signInAsNia(page);
  await page.goto('/review');

  const forbidden = new ErrorPage(page);
  await expect(forbidden.heading()).toHaveText('This part is for grown-ups');
  await forbidden.backToShelf();

  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

test('Given Nia is on the grown-ups-only page, when she chooses Switch reader, then she is signed out and sees the profile picker', async ({ page }) => {
  await signInAsNia(page);
  await page.goto('/review');
  await new ErrorPage(page).switchReader();

  await expect(new SignInPage(page).pickerHeading()).toBeVisible();
  await page.goto('/shelf');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('Given Nia is signed in, when she opens an unknown URL, then the Not found page offers a way back to her shelf', async ({ page }) => {
  await signInAsNia(page);
  await page.goto('/no/such/page');

  const notFound = new ErrorPage(page);
  await expect(notFound.heading()).toHaveText('We can’t find that page');
  await notFound.backToShelf();

  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

test('Given Dad is signed in, when he opens an unknown URL, then the Not found page offers a way back to Review', async ({ page }) => {
  await signInAsDad(page);
  await page.goto('/no/such/page');

  const notFound = new ErrorPage(page);
  await expect(notFound.heading()).toHaveText('We can’t find that page');
  await expect(notFound.homeLink('Back to my shelf')).toBeHidden();
  await notFound.homeLink('Go to Review').click();

  await expect(page).toHaveURL(/\/review$/);
});

test('Given the server fails while a page loads, when Nia opens a chapter, then she sees Something went wrong with a code and can try again', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  const failure = new ErrorPage(page);
  await failure.breakServer('**/api/books/b-lion/chapters/12/form');

  await shelf.logChapter('On the go', 'The Lion, the Witch and the Wardrobe', 12);

  await expect(failure.heading()).toHaveText('Something went wrong on our side');
  await expect(failure.codeShown()).toHaveText('SHF-1A2B');
  await expect(page.getByText(/at .*\.ts/)).toBeHidden();

  await failure.repairServer('**/api/books/b-lion/chapters/12/form');
  await failure.tryAgain();
  await expect(new LogChapterPage(page).heading()).toHaveText('Chapter 12');
});
