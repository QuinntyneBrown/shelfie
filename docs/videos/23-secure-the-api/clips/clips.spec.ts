import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { SAME_SITE } from '../../../../e2e/support/same-site';
import { DAD } from '../../../../e2e/support/accounts';
import { rememberDevice } from '../../../../e2e/support/remember-device';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { LogChapterPage } from '../../../../e2e/pages/log-chapter.page';
import { BookPage } from '../../../../e2e/pages/book.page';
import { ChapterPage } from '../../../../e2e/pages/chapter.page';
import { ErrorPage } from '../../../../e2e/pages/error.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration in script.md: the signed-out refusal, then ten password tries and the eleventh refused.
test('secure-the-api-signed-out', async ({ page }) => {
  await page.goto('/api/shelf');
  await page.waitForTimeout(10000);

  for (let attempt = 1; attempt <= 10; attempt++) {
    await page.request.post('/api/auth/password', { ...SAME_SITE, data: { email: DAD.email, password: 'wrong-guess' } });
  }
  const signIn = new SignInPage(page);
  await signIn.open();
  await page.waitForTimeout(2000);
  await signIn.signInWithPassword(DAD.email, DAD.password);
  await signIn.failureSummary().waitFor();
  await page.waitForTimeout(8000);
});

// Paced to the narration in script.md: five wrong PINs, then the lock and the time left.
test('secure-the-api-pin-lock', async ({ page }) => {
  await rememberDevice(page.context());
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.choose('Nia');
  await signIn.failPin(5);
  await signIn.lockNotice().waitFor();
  await page.waitForTimeout(4000);
});

// Paced to the narration in script.md: Review is for grown-ups, then an answer with tags in it stays plain text.
test('secure-the-api-signed-in', async ({ page }) => {
  await signInAsNia(page);
  await page.waitForTimeout(1000);
  await page.goto('/review');
  const forbidden = new ErrorPage(page);
  await forbidden.heading().waitFor();
  await page.waitForTimeout(4000);
  await forbidden.backToShelf();
  await page.waitForTimeout(1500);

  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await page.waitForTimeout(1500);
  await log.answerBox(1).pressSequentially("<b>Aslan</b><script>alert('hi')</script>", { delay: 100 });
  await page.waitForTimeout(1500);
  await log.done();
  await log.heading().waitFor();
  await page.waitForTimeout(2500);

  await page.goto('/book/b-lion');
  await new BookPage(page).openChapterRow(12);
  await new ChapterPage(page).answer(1).hover();
  await page.waitForTimeout(5000);
});
