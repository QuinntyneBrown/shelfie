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
