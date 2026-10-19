// Traces to: L2-142, L2-143, L2-146
import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addHelperReward, addZoe } from '../support/database';
import { ReviewPage } from '../pages/review.page';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';

/** Signs Nia in, logs her sessions with Zoe through the API, and signs her out again. */
async function niaReadsToZoe(page: Page, ...sessions: { kind: string; minutes: number }[]) {
  await signInAsNia(page);
  for (const { kind, minutes } of sessions) {
    const response = await page.request.post('/api/together/sessions', {
      headers: { 'X-Requested-With': 'Shelfie' },
      data: { partnerId: 'p-zoe', kind, minutes, readOn: new Date().toISOString().slice(0, 10) },
    });
    expect(response.status()).toBe(201);
  }
  await page.context().clearCookies();
}

test('Given Nia read to Zoe and helped her read, when Dad opens Review, then each session is a line in Recent activity, helper first', async ({ page }) => {
  await addZoe();
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 20 }, { kind: 'helped', minutes: 10 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.activityLine('Nia read to Zoe for 20 minutes')).toBeVisible();
  await expect(review.activityLine('Nia helped Zoe read for 10 minutes')).toBeVisible();
  await expect(review.summary()).toHaveText('2 chapters to read · 1 reward to give');
});

test('Given a mistaken session, when Dad removes it, then the line goes, a toast confirms it, and it leaves Nia’s shelf', async ({ page }) => {
  await addZoe();
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 20 }, { kind: 'helped', minutes: 10 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await review.removeSession('Nia read to Zoe for 20 minutes');
  await expect(review.toast('Removed')).toBeVisible();
  await expect(review.activityLine('Nia read to Zoe for 20 minutes')).toHaveCount(0);
  await expect(review.activityLine('Nia helped Zoe read for 10 minutes')).toBeVisible();

  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.togetherSessions()).toHaveCount(1);
  await expect(shelf.togetherSession('You helped Zoe read · 10 minutes')).toBeVisible();
});

test('Given the connection drops, when Dad removes a session, then a toast says it wasn’t removed and the line stays', async ({ page }) => {
  await addZoe();
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 20 });
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.breakRemoving();

  await review.removeSession('Nia read to Zoe for 20 minutes');
  await expect(review.toast('That wasn’t removed')).toBeVisible();
  await expect(review.activityLine('Nia read to Zoe for 20 minutes')).toBeVisible();
});

test('Given Nia reached the helper target, when Dad gives it from Review, then the card goes, Settings says given, and her minutes start again', async ({ page }) => {
  await addZoe();
  await addHelperReward('Cinema trip', 120);
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 60 }, { kind: 'read-to', minutes: 60 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.helperRewardCard()).toContainText('Nia reached 120 helper minutes');
  await expect(review.helperRewardCard()).toContainText('Her reward: Cinema trip');
  await expect(review.summary()).toHaveText('2 chapters to read · 2 rewards to give');

  await review.giveHelperReward();
  await expect(review.toast('Cinema trip given')).toBeVisible();
  await expect(review.helperRewardCard()).toHaveCount(0);
  await expect(review.summary()).toHaveText('2 chapters to read · 1 reward to give');

  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.helperRewardRow()).toContainText(/Given \w{3} \d+ \w{3} · counting again/);

  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.togetherSessions()).toHaveCount(2);
  await expect(shelf.helperCelebration()).toHaveCount(0);
  await expect(shelf.helperProgress()).toHaveCount(0);
});

test('Given a helper reward not yet reached, then Review has no card for it', async ({ page }) => {
  await addZoe();
  await addHelperReward('Cinema trip', 120);
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 30 });
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.activityLine('Nia read to Zoe for 30 minutes')).toBeVisible();
  await expect(review.helperRewardCard()).toHaveCount(0);
});

test('Given the connection drops, when Dad gives the helper reward, then a toast says it wasn’t given and the card stays', async ({ page }) => {
  await addZoe();
  await addHelperReward('Cinema trip', 120);
  await niaReadsToZoe(page, { kind: 'read-to', minutes: 120 });
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.breakGivingHelperReward();

  await review.giveHelperReward();
  await expect(review.toast('The reward wasn’t given')).toBeVisible();
  await expect(review.helperRewardCard()).toBeVisible();
});

test('Given a reader session, when it removes a session or gives the helper reward, then the API answers 403', async ({ page }) => {
  await addZoe();
  await addHelperReward('Cinema trip', 30);
  await signInAsNia(page);
  const logged = await page.request.post('/api/together/sessions', {
    headers: { 'X-Requested-With': 'Shelfie' },
    data: { partnerId: 'p-zoe', kind: 'read-to', minutes: 30, readOn: new Date().toISOString().slice(0, 10) },
  });
  const { id } = (await logged.json()) as { id: string };

  expect((await page.request.delete(`/api/together/sessions/${id}`, { headers: { 'X-Requested-With': 'Shelfie' } })).status()).toBe(403);
  expect((await page.request.post('/api/helper-reward/give', { headers: { 'X-Requested-With': 'Shelfie' } })).status()).toBe(403);
});
