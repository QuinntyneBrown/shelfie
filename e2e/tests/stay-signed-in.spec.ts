// Traces to: L2-003
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia is signed in, when the page is reloaded, then she is still signed in on the same page', async ({ page }) => {
  await signInAsNia(page);

  await page.reload();

  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

for (const path of ['/shelf', '/review', '/books/b-lion/chapters/12/log']) {
  test(`Given nobody is signed in, when ${path} is opened, then the sign-in page is shown`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in$/);
  });
}
