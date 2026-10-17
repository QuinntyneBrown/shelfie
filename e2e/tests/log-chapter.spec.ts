// Traces to: L2-011
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given Nia is on the next chapter, when she answers question 1 and presses I’m done!, then the chapter is saved and shown on her shelf', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.logChapter('On the go', LION, 12);

  const log = new LogChapterPage(page);
  await log.answer(1, 'Edmund said sorry to the animals.');
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  await expect(log.progressSummary()).toContainText('That’s 12 of 17');
  await expect(log.progressBar('12 of 17 chapters read')).toBeVisible();

  await log.backToShelf();
  await expect(shelf.book('On the go', LION).getByRole('progressbar', { name: '12 of 17 chapters read' })).toBeVisible();
  await expect(shelf.book('On the go', LION).getByRole('link', { name: 'Log Chapter 13' })).toBeVisible();
});
