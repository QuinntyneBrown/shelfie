// Traces to: L2-005
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ErrorPage } from '../pages/error.page';
import { ShelfPage } from '../pages/shelf.page';
import { SignInPage } from '../pages/sign-in.page';

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
