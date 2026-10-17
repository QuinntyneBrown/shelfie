// Traces to: L2-024
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia goes offline, then a banner says so on every page and goes when she is back online', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(new ShelfPage(page).book('On the go', 'The Wild Robot')).toBeVisible();

  await shell.goOffline();
  await expect(shell.offlineBanner()).toContainText('Showing what we saved earlier.');
  await shell.goOnline();
  await expect(shell.offlineBanner()).toHaveCount(0);
});

test('Given Nia loaded her shelf, when she goes offline and comes back to it, then it is still readable', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await new ShellPage(page).goOffline();

  await page.getByRole('link', { name: 'Add a book' }).click();
  await page.getByRole('link', { name: 'Cancel' }).click();

  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await expect(shelf.loadError()).toHaveCount(0);
});
