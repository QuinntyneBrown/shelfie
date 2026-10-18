// Traces to: L2-049, L2-050, L2-051, L2-052, L2-053
import { test, expect } from '../support/test';
import { holdAssistant } from '../support/assistant';
import { signInAsDad } from '../support/signed-in';
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
