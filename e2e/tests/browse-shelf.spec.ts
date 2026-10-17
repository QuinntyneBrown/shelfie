// Traces to: L2-007
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';

test('Given books in every state, when Nia opens her shelf, then each shows its cover, title, progress and next action', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  const lion = shelf.book('On the go', 'The Lion, the Witch and the Wardrobe');
  await expect(shelf.cover('On the go', 'The Lion, the Witch and the Wardrobe')).toHaveText('🦁');
  await expect(shelf.cover('On the go', 'The Lion, the Witch and the Wardrobe')).toHaveClass(/cover--sage/);
  await expect(lion.getByRole('progressbar', { name: '11 of 17 chapters read' })).toBeVisible();
  await expect(lion.getByRole('link', { name: 'Log Chapter 12' })).toHaveAttribute('href', '/books/b-lion/chapters/12/log');

  const winn = shelf.book('Up next', 'Because of Winn-Dixie');
  await expect(winn.getByRole('link', { name: 'Start with Chapter 1' })).toBeVisible();

  await expect(shelf.finishedBook('Matilda')).toBeVisible();
});

test('Given finished books, when Nia opens her shelf, then each shows its reward and date, or that the reward is still being picked', async ({ page }) => {
  // Traces to: L2-018
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.finishedBook('Charlotte’s Web')).toContainText('Movie night with popcorn · Sun 11 Oct');
  await expect(shelf.finishedBook('Matilda')).toContainText('Finished Tue 13 Oct · Dad is picking your reward');
});

test('Given a slow server, when Nia opens her shelf, then placeholders show until the books arrive', async ({ page }) => {
  const shelf = new ShelfPage(page);
  const release = await shelf.holdShelfResponse();
  await signInAsNia(page);

  await expect(shelf.loading()).toBeVisible();
  release();
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await expect(shelf.loading()).toBeHidden();
});

test('Given the server cannot be reached, when Nia opens her shelf, then she can try again and the books load', async ({ page }) => {
  const shelf = new ShelfPage(page);
  await shelf.breakShelfRequests();
  await signInAsNia(page);

  await expect(shelf.loadError()).toBeVisible();
  await shelf.repairShelfRequests();
  await shelf.tryAgain();
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await expect(shelf.loadError()).toBeHidden();
});

test.describe('with no books', () => {
  test.use({ shelf: 'empty' });

  test('Given no books, when Nia opens her shelf, then it tells her to ask a grown-up to add one', async ({ page }) => {
    await signInAsNia(page);
    const shelf = new ShelfPage(page);

    await expect(shelf.emptyTitle()).toBeVisible();
    await expect(shelf.askAGrownUp()).toBeVisible();
  });
});
