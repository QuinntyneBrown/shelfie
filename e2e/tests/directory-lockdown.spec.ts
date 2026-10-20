// Traces to: L2-175, L2-005
import { test, expect } from '../support/test';
import { joinAsRosa, joinAsSam, signInAsDad } from '../support/signed-in';
import { ErrorPage } from '../pages/error.page';
import { MyProfilePage } from '../pages/my-profile.page';
import { ReviewPage } from '../pages/review.page';

const HOUSEHOLD_PAGES = ['/shelf', '/book/b-lion', '/add-book', '/books/b-lion/chapters/12/log', '/chapter-logs/b-lion-c1', '/review', '/review/chapters/b-lion-c11', '/books', '/manage-book/b-lion', '/settings', '/onboarding'];

test('Given Rosa, an author, when she opens any family page by URL, then she is told it is for families and can go back to her profile', async ({ page }) => {
  await joinAsRosa(page);
  const forbidden = new ErrorPage(page);

  for (const path of HOUSEHOLD_PAGES) {
    await page.goto(path);
    await expect(forbidden.heading(), path).toHaveText('This part is for families');
  }
  await forbidden.homeLink('Back to my profile').click();

  await expect(new MyProfilePage(page).heading()).toHaveText('My profile');
});

test('Given Sam, a volunteer, when he opens the shelf or Review by URL, then he gets the same page', async ({ page }) => {
  await joinAsSam(page);
  const forbidden = new ErrorPage(page);

  for (const path of ['/shelf', '/review']) {
    await page.goto(path);
    await expect(forbidden.heading(), path).toHaveText('This part is for families');
  }
});

test('Given Dad, when he opens My profile by URL, then he is taken to Review instead', async ({ page }) => {
  await signInAsDad(page);
  await page.goto('/me');

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
});
