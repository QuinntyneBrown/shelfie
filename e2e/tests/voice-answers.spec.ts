// Traces to: L2-093, L2-094, L2-095
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { answersGiven } from '../support/database';

const LION = 'The Lion, the Witch and the Wardrobe';

async function openChapter(page: import('@playwright/test').Page, log: LogChapterPage) {
  await log.useFakeSpeech();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
}

test('Given a browser with speech recognition, when she dictates, then her words are added after what she typed, shown as she speaks, and stay editable', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.answer(1, 'Lucy found the wardrobe.');
  await log.dictate(1);
  await expect(log.dictateButton(1, { pressed: true })).toBeVisible();
  await expect(log.listeningHint()).toBeVisible();
  expect(await log.speechLanguage()).toBe('en');

  await log.hear('and then');
  await expect(log.answerBox(1)).toHaveValue('Lucy found the wardrobe. and then');
  await log.hear('and then she met Mr Tumnus');
  await expect(log.answerBox(1)).toHaveValue('Lucy found the wardrobe. and then she met Mr Tumnus');

  await log.typeMore(1, '!');
  await expect(log.answerBox(1)).toHaveValue('Lucy found the wardrobe. and then she met Mr Tumnus!');
});

test('Given she is listening, when she chooses the button again, then listening stops and the words stay; the same when the browser ends it', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.dictate(2);
  await log.hear('Mr Tumnus');
  await log.dictate(2);
  await expect(log.dictateButton(2, { pressed: false })).toBeVisible();
  await expect(log.listeningHint()).toHaveCount(0);
  await expect(log.answerBox(2)).toHaveValue('Mr Tumnus');

  await log.dictate(2);
  await log.hear('Aslan');
  await log.stopSpeech();
  await expect(log.dictateButton(2, { pressed: false })).toBeVisible();
  await expect(log.answerBox(2)).toHaveValue('Mr Tumnus Aslan');
});

test('Given dictation, when it starts and stops, then a polite live region announces it', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.dictate(1);
  await expect(log.listeningAnnouncement()).toHaveText('Listening');
  await log.dictate(1);
  await expect(log.listeningAnnouncement()).toHaveText('Stopped listening');
});

test('Given an answer near its limit, when she dictates more, then the answer is cut at 2000 characters and the counter stays right', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.answer(1, 'a'.repeat(1990));
  await log.dictate(1);
  await log.hear('b'.repeat(40));

  expect(await log.answerLength(1)).toBe(2000);
  await expect(log.charactersLeft()).toHaveText('0 characters left');
});

test('Given she is dictating in one answer, when she starts in another, then the first stops', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.dictate(1);
  await log.dictate(2);

  await expect(log.dictateButton(1, { pressed: false })).toBeVisible();
  await expect(log.dictateButton(2, { pressed: true })).toBeVisible();
});

test('Given dictated words, when she presses I’m done!, then they are saved like typed ones', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.dictate(1);
  await log.hear('Edmund said sorry to the animals');
  await log.dictate(1);
  await log.done();

  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect((await answersGiven('b-lion', 12))[0]).toBe('Edmund said sorry to the animals');
});

test('Given a browser without speech recognition, then no microphone button shows and typing works', async ({ page }) => {
  const log = new LogChapterPage(page);
  await log.useNoSpeech();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);

  await log.answer(1, 'Typed.');
  await expect(log.answerBox(1)).toHaveValue('Typed.');
  await expect(log.dictateButton(1)).toHaveCount(0);
});

test('Given the microphone is refused, then she is told she can type, what she typed stays, and she can try again', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.answer(2, 'Mr Tumnus');
  await log.dictate(2);
  await log.refuseMicrophone();

  await expect(log.cannotHearYou()).toBeVisible();
  await expect(log.answerBox(2)).toHaveAccessibleDescription(/Shelfie can’t hear you/);
  await expect(log.dictateButton(2, { pressed: false })).toBeVisible();
  await expect(log.answerBox(2)).toHaveValue('Mr Tumnus');

  await log.dictate(2);
  await expect(log.cannotHearYou()).toHaveCount(0);
  await expect(log.dictateButton(2, { pressed: true })).toBeVisible();
});

test('Given the microphone button, then it is at least 44 px tall and an axe scan finds no serious problems while listening', async ({ page }) => {
  const log = new LogChapterPage(page);
  await openChapter(page, log);

  await log.dictate(1);
  const box = await log.dictateButton(1).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
});
