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

test('Given question 1 is blank, when she presses I’m done!, then an inline error shows, nothing is saved, and blank answers 2 and 3 are fine once question 1 is answered', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.answer(1, '   ');
  await log.answer(2, 'Edmund');
  await log.done();

  await expect(log.summary()).toContainText('Question 1 needs an answer');
  await expect(log.answerBox(1)).toHaveAccessibleDescription(/Write a sentence or two about what happened\. There are no wrong answers!$/);
  await expect(log.answerBox(1)).toBeFocused();
  await expect(log.heading()).toHaveText('Chapter 12');

  await log.answer(1, 'He said sorry.');
  await log.done();
  await expect(log.heading()).toHaveText('Chapter 12 done!');
});

test('Given a long answer, when she keeps typing past 2000 characters, then input stops at 2000 and a counter shows', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.answer(1, 'a'.repeat(1950));
  await expect(log.charactersLeft()).toHaveText('50 characters left');
  await log.typeMore(1, 'b'.repeat(60));

  expect(await log.answerLength(1)).toBe(2000);
  await expect(log.charactersLeft()).toHaveText('0 characters left');
});

test('Given a request that skips the form, when question 1 is blank or an answer is over 2000 characters, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const blank = await log.postLog('b-lion', 12, { readOn: '2026-10-17', answers: [{ position: 1, text: '  ' }] });
  const tooLong = await log.postLog('b-lion', 12, { readOn: '2026-10-17', answers: [{ position: 1, text: 'a'.repeat(2001) }] });

  expect([blank.status(), tooLong.status()]).toEqual([400, 400]);
});
