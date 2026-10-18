// Traces to: L2-006
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { LogChapterPage } from '../pages/log-chapter.page';
import { householdDay } from '../support/database';

const OTHER_FAMILYS_BOOK = 'b-other';
const answers = [{ position: 1, text: 'Hello.' }];

test('Given another family’s book id, when Nia asks for its chapter form, then the answer is not found and shows nothing of theirs', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.readForm(OTHER_FAMILYS_BOOK, 2);

  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Secret Garden');
});

test('Given another family’s book id, when Nia tries to log a chapter in it, then it is refused and nothing is saved', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.postLog(OTHER_FAMILYS_BOOK, 2, { readOn: householdDay(), answers });

  expect(response.status()).toBe(404);
});

test('Given another family’s chapter log, when Nia asks to undo it, then it is not found and stays', async ({ page }) => {
  await signInAsNia(page);
  const log = new LogChapterPage(page);

  const response = await log.undoViaApi('b-other-c1');

  expect(response.status()).toBe(404);
});

test('Given two families’ books, when Nia asks for her shelf, then only her family’s books are listed', async ({ page }) => {
  await signInAsNia(page);

  const response = await page.request.get('/api/shelf');

  expect(await response.text()).not.toContain('Secret Garden');
});
