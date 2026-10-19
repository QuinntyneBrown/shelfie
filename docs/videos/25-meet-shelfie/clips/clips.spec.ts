import { test } from '../../../../tools/video-record/test';
import type { Page } from '@playwright/test';
import { DAD, NIA } from '../../../../e2e/support/accounts';
import { SAME_SITE } from '../../../../e2e/support/same-site';
import { addGalleryReward, pickGoal, setReadingDays } from '../../../../e2e/support/database';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';
import { ReviewPage } from '../../../../e2e/pages/review.page';
import { ReviewChapterPage } from '../../../../e2e/pages/review-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// The seeded books' real covers, by ISBN, fetched from Open Library once before recording (as
// tools/marketing-screenshots does), so the shelf on screen shows real books.
const isbns = {
  'b-lion': '9780064404990',
  'b-robot': '9780316381994',
  'b-bfg': '9780141365428',
  'b-winn': '9780763644321',
  'b-matilda': '9780142410370',
  'b-web': '9780064400558',
};
const covers = new Map<string, { type: string; data: Buffer }>();

test.beforeAll(async () => {
  for (const [book, isbn] of Object.entries(isbns)) {
    const picture = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
    if (!picture.ok) throw new Error(`No Open Library cover for ${isbn}`);
    covers.set(book, { type: picture.headers.get('content-type') ?? 'image/jpeg', data: Buffer.from(await picture.arrayBuffer()) });
  }
});

// Signs in through the API and gives every book its cover, so the recording starts on the first
// screen rather than the sign-in form (page.request shares the browser context's cookies).
async function signIn(page: Page, who: { username: string; password: string }) {
  const response = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { ...who, remember: false } });
  if (!response.ok()) throw new Error(`Sign-in as ${who.username} failed: ${response.status()}`);
  for (const [book, { type, data }] of covers) {
    const upload = await page.request.put(`/api/books/${book}/cover`, { headers: { ...SAME_SITE.headers, 'Content-Type': type }, data });
    if (!upload.ok()) throw new Error(`Cover upload for ${book} failed: ${upload.status()}`);
  }
}

// Nia has read six days in a row and is reading toward a reward, so her shelf is worth showing.
async function niasWeek() {
  await setReadingDays([1, 2, 3, 4, 5, 6]);
  await pickGoal(await addGalleryReward('Trip to the zoo', 2, 'Finish two books'));
}

// Paced to "The shelf" in script.md: on the go, up next, finished.
test('the-shelf', async ({ page }) => {
  await niasWeek();
  await signIn(page, NIA);
  await page.goto('/shelf');
  const shelf = new ShelfPage(page);
  await shelf.greeting().waitFor();
  await page.waitForTimeout(1500);
  await shelf.book('On the go', LION).hover();
  await page.waitForTimeout(2500);
  await shelf.book('Up next', 'Because of Winn-Dixie').hover();
  await page.waitForTimeout(2000);
  await shelf.finishedBook('Matilda').scrollIntoViewIfNeeded();
  await shelf.finishedBook('Matilda').hover();
  await page.waitForTimeout(2500);
});

// Paced to "Log a chapter": one tap, Olive's first question, Next, the second, I'm done.
test('log-a-chapter', async ({ page }) => {
  await niasWeek();
  await signIn(page, NIA);
  await page.goto('/shelf');
  const shelf = new ShelfPage(page);
  await shelf.greeting().waitFor();
  await page.waitForTimeout(1000);
  await shelf.logChapter('On the go', LION, 12);

  const log = new LogChapterPage(page);
  await log.greeting().waitFor();
  await page.waitForTimeout(1500);
  await log.answerBox(1).pressSequentially('Edmund said sorry to the animals.', { delay: 50 });
  await page.waitForTimeout(500);
  await log.next(1);
  await page.waitForTimeout(1500);
  await log.answerBox(2).pressSequentially('He felt bad about what he did.', { delay: 50 });
  await page.waitForTimeout(500);
  await log.done();
  await log.heading().waitFor();
  await page.waitForTimeout(3000);
});

// Paced to "Grown-ups": the queue, Nia's answers, a sticker and a note, Send.
test('review-a-chapter', async ({ page }) => {
  await signIn(page, DAD);
  await page.goto('/review');
  const review = new ReviewPage(page);
  await review.queue().first().hover();
  await page.waitForTimeout(1500);
  await review.review(11);

  const chapter = new ReviewChapterPage(page);
  await chapter.answers().first().hover();
  await page.waitForTimeout(2000);
  await chapter.pickSticker('Wise owl');
  await page.waitForTimeout(1000);
  await chapter.noteField().pressSequentially('Lovely answer, Nia.', { delay: 50 });
  await page.waitForTimeout(500);
  await chapter.send();
  await chapter.sentHeading().waitFor();
  await page.waitForTimeout(2500);
});

// Paced to "Rewards": the last chapter of The BFG, then the party.
test('finish-a-book', async ({ page }) => {
  await niasWeek();
  await signIn(page, NIA);
  await page.goto('/shelf');
  const shelf = new ShelfPage(page);
  await shelf.greeting().waitFor();
  await page.waitForTimeout(800);
  await shelf.logChapter('On the go', 'The BFG', 3);

  const log = new LogChapterPage(page);
  await log.greeting().waitFor();
  await page.waitForTimeout(1000);
  await log.answerBox(1).pressSequentially('The giant blew dreams into bedrooms.', { delay: 50 });
  await page.waitForTimeout(500);
  await log.done();
  await log.finishedHeading().waitFor();
  await page.waitForTimeout(6000);
});
