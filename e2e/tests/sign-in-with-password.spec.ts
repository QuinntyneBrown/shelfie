// Traces to: L2-002
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';
import { ReviewPage } from '../pages/review.page';

test('Given a browser that has not signed in before, when Dad enters his e-mail and password, then he lands on Review', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.email, DAD.password);

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
});
