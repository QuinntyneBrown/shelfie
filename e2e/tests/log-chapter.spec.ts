// Traces to: L2-011
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { householdDay, readOnOf } from '../support/database';

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

test('Given she did not change the day, when she logs a chapter, then it is saved as read today', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.answer(1, 'He said sorry.');
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect(readOnOf('b-lion', 12)).toBe(householdDay());
});

test('Given she chooses Yesterday, when she logs a chapter, then it is saved as read yesterday', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.chooseDay('Yesterday');
  await log.answer(1, 'He said sorry.');
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect(readOnOf('b-lion', 12)).toBe(householdDay(-1));
});

test('Given she chooses Another day, when she picks a past day and logs, then that day is saved', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.chooseDay('Another day');
  await log.pickDay(householdDay(-5));
  await log.answer(1, 'He said sorry.');
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect(readOnOf('b-lion', 12)).toBe(householdDay(-5));
});

test('Given she picks a day in the future, when she presses I’m done!, then she is asked for today or earlier and nothing is saved', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);

  await log.chooseDay('Another day');
  await log.pickDay(householdDay(2));
  await log.answer(1, 'He said sorry.');
  await log.done();

  await expect(log.dayError()).toBeVisible();
  await expect(log.heading()).toHaveText('Chapter 12');
  expect(readOnOf('b-lion', 12)).toBeUndefined();
});

test('Given a request that skips the form, when the day is in the future, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.postLog('b-lion', 12, { readOn: householdDay(2), answers: [{ position: 1, text: 'He said sorry.' }] });

  expect(response.status()).toBe(400);
  expect(readOnOf('b-lion', 12)).toBeUndefined();
});

const answers = [{ position: 1, text: 'He said sorry.' }];

test('Given a chapter is already logged, when it is logged again, then the API refuses the duplicate', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const first = await log.postLog('b-lion', 12, { readOn: householdDay(), answers });
  const second = await log.postLog('b-lion', 12, { readOn: householdDay(), answers });
  const earlier = await log.postLog('b-lion', 11, { readOn: householdDay(), answers });

  expect(first.status()).toBe(201);
  expect([second.status(), (await second.json()).type]).toEqual([409, 'chapter-already-logged']);
  expect([earlier.status(), (await earlier.json()).type]).toEqual([409, 'chapter-already-logged']);
});

test('Given chapter 12 is next, when a later chapter is logged, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const skipped = await log.postLog('b-lion', 14, { readOn: householdDay(), answers });

  expect([skipped.status(), (await skipped.json()).type]).toEqual([409, 'chapter-out-of-order']);
  expect(readOnOf('b-lion', 14)).toBeUndefined();
});

test('Given a chapter that does not exist, when its form is asked for, then the API says not found', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  expect((await log.readForm('b-lion', 18)).status()).toBe(404);
  expect((await log.readForm('b-nothing', 1)).status()).toBe(404);
});

test('Given a chapter is already logged, when its form is asked for, then the API names the existing log', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.readForm('b-lion', 11);

  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({ type: 'chapter-already-logged', chapterLogId: 'b-lion-c11' });
});

test('Given she has started writing, when she comes back to the same chapter on this device, then her answers and day are restored', async ({ page }) => {
  const log = new LogChapterPage(page);
  await log.useFakeTimers();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);

  await log.chooseDay('Yesterday');
  await log.answer(1, 'Edmund said sorry');
  await log.answer(3, 'Aslan will help');
  await log.letTimePass(3000);
  await log.reload();

  await expect(log.answerBox(1)).toHaveValue('Edmund said sorry');
  await expect(log.answerBox(2)).toHaveValue('');
  await expect(log.answerBox(3)).toHaveValue('Aslan will help');
  await expect(log.dayChosen('Yesterday')).toHaveAttribute('aria-pressed', 'true');
});

test('Given she has a saved draft, when she logs the chapter, then the draft is removed', async ({ page }) => {
  const log = new LogChapterPage(page);
  await log.useFakeTimers();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);

  await log.answer(1, 'Edmund said sorry');
  await log.letTimePass(3000);
  expect(await log.hasSavedDraft('b-lion', 12)).toBe(true);
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect(await log.hasSavedDraft('b-lion', 12)).toBe(false);
});

test('Given she has just logged a chapter, when she presses Undo on the toast, then the chapter is unlogged and her answers are back on the form', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'Edmund said sorry');
  await log.done();

  await expect(log.undoToast()).toContainText('Chapter 12 saved');
  await log.undo();

  await expect(log.heading()).toHaveText('Chapter 12');
  await expect(log.answerBox(1)).toHaveValue('Edmund said sorry');
  expect(readOnOf('b-lion', 12)).toBeUndefined();
});

test('Given she has moved on to her shelf, when she presses Undo on the toast, then she is taken back to the chapter with her answers', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'Edmund said sorry');
  await log.done();
  await log.backToShelf();

  await log.undo();

  await expect(log.heading()).toHaveText('Chapter 12');
  await expect(log.answerBox(1)).toHaveValue('Edmund said sorry');
});

test('Given the Undo toast is showing, then it lasts 10 seconds and waits while she hovers over it', async ({ page }) => {
  const log = new LogChapterPage(page);
  await log.useFakeTimers();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  await log.answer(1, 'Edmund said sorry');
  await log.done();
  await expect(log.undoToast()).toBeVisible();

  await log.letTimePass(9000);
  await expect(log.undoToast()).toBeVisible();

  await log.hoverToast();
  await log.letTimePass(20000);
  await expect(log.undoToast()).toBeVisible();

  await log.moveAwayFromToast();
  await log.letTimePass(10000);
  await expect(log.undoToast()).toBeHidden();
});

test('Given the Undo window has passed, when an undo is sent, then the API refuses it and the answers stay final', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.undoViaApi('b-lion-c11');

  expect([response.status(), (await response.json()).type]).toEqual([409, 'undo-expired']);
});
