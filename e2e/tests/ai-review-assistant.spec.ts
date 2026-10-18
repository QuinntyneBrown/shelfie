// Traces to: L2-064, L2-065, L2-066, L2-067, L2-068
import { test, expect } from '../support/test';
import { assistantFails, assistantNotSetUp, assistantWorks, holdAssistant } from '../support/assistant';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ChapterPage } from '../pages/chapter.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';

test('Given a pending chapter, when Dad opens it, then Help me review is offered and nothing is sent to the assistant until he presses it', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  chapter.watchAssists();
  await chapter.open('b-lion-c11');

  await expect(chapter.helpButton()).toBeEnabled();
  await expect(chapter.flags()).toHaveCount(0);
  expect(chapter.assistCount()).toBe(0);
});

test('Given a short answer, when Dad asks for help, then the button is busy while the assistant reads, and the answer is flagged with a reason', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  const release = holdAssistant();

  await chapter.askForHelp();
  await expect(chapter.helpButton()).toHaveAttribute('aria-busy', 'true');
  await chapter.pickSticker('Rocket');
  await chapter.noteField().fill('Still typing while it reads.');
  release();

  await expect(chapter.flag(1)).toContainText('Only a few words. Ask what else happened.');
  await expect(chapter.assistSummary()).toContainText('1 answer to talk about');
  await expect(chapter.helpButton()).toHaveCount(0);
  await expect(chapter.noteField()).toHaveValue('Still typing while it reads.');
});

test('Given answers that show she understood, when Dad asks for help, then nothing is flagged and he is told every answer looks good', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c10');

  await chapter.askForHelp();

  await expect(chapter.assistSummary()).toContainText('Every answer looks good');
  await expect(chapter.flags()).toHaveCount(0);
});

const DRAFT = 'Thank you for telling me about Chapter 11! What was your favourite part?';

test('Given the assistant’s advice, when Dad uses the draft, edits it, picks a sticker and sends, then Nia sees only his sticker and note, and no flags', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  await chapter.askForHelp();

  await expect(chapter.suggestedNote()).toContainText(DRAFT);
  await expect(chapter.noteField()).toHaveValue('');
  await chapter.useDraft();
  await expect(chapter.noteField()).toHaveValue(DRAFT);
  await chapter.noteField().fill(`${DRAFT} Love, Dad`);
  await chapter.pickSticker('Wise owl');
  await chapter.send();
  await expect(chapter.sentHeading()).toBeVisible();

  await page.context().clearCookies();
  await signInAsNia(page);
  const reader = new ChapterPage(page);
  await reader.open('b-lion-c11');
  await expect(reader.feedback()).toContainText('Wise owl');
  await expect(reader.feedback()).toContainText(`${DRAFT} Love, Dad`);
  await expect(page.getByText('Talk about this')).toHaveCount(0);
  await expect(page.getByText('Only a few words')).toHaveCount(0);
});

test('Given Dad has typed a note, when the assistant suggests one, then Use draft is off and says why, and his note is kept', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  await chapter.noteField().fill('My own words.');
  await chapter.askForHelp();

  await expect(chapter.useDraftButton()).toBeDisabled();
  await expect(chapter.suggestedNote()).toContainText('Your note already has words in it, so the draft won’t replace them.');
  await expect(chapter.noteField()).toHaveValue('My own words.');

  await chapter.noteField().fill('');
  await chapter.useDraft();
  await expect(chapter.noteField()).toHaveValue(DRAFT);
});

test('Given the assistant fails, when Dad asks for help, then he is told it couldn’t help, can try again, and can review on his own meanwhile', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  assistantFails();

  await chapter.askForHelp();
  await expect(chapter.assistFailed()).toContainText('You can still review on your own.');
  await chapter.noteField().fill('Lovely, Nia.');

  assistantWorks();
  await chapter.tryAgain();
  await expect(chapter.flag(1)).toBeVisible();
  await expect(chapter.assistFailed()).toHaveCount(0);
  await expect(chapter.noteField()).toHaveValue('Lovely, Nia.');
  await chapter.pickSticker('Star');
  await chapter.send();
  await expect(chapter.sentHeading()).toBeVisible();
});

test('Given the assistant is not set up, when Dad asks for help, then he is told so without a retry, and reviewing works as before', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  assistantNotSetUp();

  await chapter.askForHelp();

  await expect(chapter.assistNotSetUp()).toContainText('You can still review on your own.');
  await expect(chapter.helpButton()).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await chapter.pickSticker('Cookie');
  await chapter.send();
  await expect(chapter.sentHeading()).toBeVisible();
});

test('Given a chapter Dad already reviewed, when he opens it, then the assistant is not offered', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c9');

  await expect(chapter.sentFeedback()).toContainText('You gave a Star');
  await expect(chapter.helpButton()).toHaveCount(0);
});

test('Given Dad sends and moves on while the assistant is still reading, when its advice arrives, then it does not show on the next chapter', async ({ page }) => {
  await signInAsDad(page);
  const chapter = new ReviewChapterPage(page);
  await chapter.open('b-lion-c11');
  const release = holdAssistant();
  await chapter.askForHelp();
  await chapter.pickSticker('Star');
  await chapter.send();
  await chapter.reviewNext(10);
  await expect(chapter.heading()).toHaveText('Chapter 10');

  release();

  await expect(chapter.helpButton()).toBeEnabled();
  await expect(chapter.assistSummary()).toHaveCount(0);
  await expect(chapter.suggestedNote()).toHaveCount(0);
});
