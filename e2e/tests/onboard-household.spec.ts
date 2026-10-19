// Traces to: L2-137, L2-138, L2-139, L2-140, L2-141, L2-142
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { inviteLinkFor } from '../support/mailbox';
import { SignUpPage } from '../pages/sign-up.page';
import { SignInPage } from '../pages/sign-in.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { SettingsPage } from '../pages/settings.page';
import { InviteParentDialog } from '../pages/invite-parent-dialog.page';
import { AcceptInvitePage } from '../pages/accept-invite.page';
import { ErrorPage } from '../pages/error.page';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';

const PRIYA = { name: 'Priya', email: 'priya@example.com', username: 'priya', password: 'bookworm-2026' };
const ZARA = { name: 'Zara', username: 'zara', password: 'dragons-rule-9' };

/** Priya starts a household of her own and lands on the wizard. */
async function signUpAsPriya(page: Parameters<typeof signInAsDad>[0]) {
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.fill(PRIYA);
  await signUp.submit();
  await page.waitForURL(/\/onboarding$/);
}

test('Given a new parent signs up, when her household starts, then the wizard opens on its welcome step with no shell navigation', async ({ page }) => {
  await signUpAsPriya(page);

  const onboarding = new OnboardingPage(page);
  await expect(onboarding.heading()).toHaveText('Let’s set up Shelfie for your family');
  await expect(onboarding.stepLabel()).toHaveText('Step 1 of 5');
  await expect(onboarding.shellNavigation()).toHaveCount(0);
});

test('Given Priya accepts Dad’s invite, when she joins his household, then Review opens and the wizard never shows for her', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.inviteParent();
  const dialog = new InviteParentDialog(page);
  await dialog.send(PRIYA.email);
  await dialog.done();
  await settings.signOut();
  const accept = new AcceptInvitePage(page);
  await accept.openLink(await inviteLinkFor(PRIYA.email));
  await accept.join(PRIYA);
  await expect(page).toHaveURL(/\/review$/);

  await new OnboardingPage(page).open();

  await expect(page).toHaveURL(/\/review$/);
});

test('Given a household from before the wizard, when Dad signs in, then Review opens and the wizard’s address sends him back to Review', async ({ page }) => {
  await signInAsDad(page);

  await new OnboardingPage(page).open();

  await expect(page).toHaveURL(/\/review$/);
});

test('Given a reader, when she opens the wizard’s address, then the grown-ups-only page shows', async ({ page }) => {
  await signInAsNia(page);

  await new OnboardingPage(page).open();

  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
});

test('Given Priya signed up and left before finishing, when she signs in on another device, then the wizard opens at its welcome step', async ({ page, browser, baseURL }) => {
  await signUpAsPriya(page);

  const laptop = await browser.newContext({ baseURL });
  const other = await laptop.newPage();
  await new SignInPage(other).open();
  await new SignInPage(other).signInWithPassword(PRIYA.username, PRIYA.password);

  await expect(other).toHaveURL(/\/onboarding$/);
  await expect(new OnboardingPage(other).stepLabel()).toHaveText('Step 1 of 5');
  await laptop.close();
});

test('Given the welcome step, when Priya presses Let’s go, then the child’s name step opens as step 2', async ({ page }) => {
  await signUpAsPriya(page);
  const onboarding = new OnboardingPage(page);

  await onboarding.letsGo();

  await expect(page).toHaveURL(/\/onboarding\/child$/);
  await expect(onboarding.heading()).toHaveText('What’s your child’s name?');
  await expect(onboarding.stepLabel()).toHaveText('Step 2 of 5');
});

test('Given the welcome step, when Priya skips for now, then Review opens and the wizard never comes back, even on another device', async ({ page, browser, baseURL }) => {
  await signUpAsPriya(page);
  const onboarding = new OnboardingPage(page);

  await onboarding.skipForNow();

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
  await onboarding.open();
  await expect(page).toHaveURL(/\/review$/);

  const laptop = await browser.newContext({ baseURL });
  const other = await laptop.newPage();
  await new SignInPage(other).open();
  await new SignInPage(other).signInWithPassword(PRIYA.username, PRIYA.password);
  await expect(other).toHaveURL(/\/review$/);
  await laptop.close();
});

/** Priya signs up and reaches the child's name step. */
async function startWizard(page: Parameters<typeof signInAsDad>[0]) {
  await signUpAsPriya(page);
  const onboarding = new OnboardingPage(page);
  await onboarding.letsGo();
  return onboarding;
}

test('Given the name step, when the name is empty, then the field says so and nothing is sent; when a name is given, then the sign-in step opens with the username prefilled', async ({ page }) => {
  const onboarding = await startWizard(page);

  await onboarding.next();
  await expect(onboarding.nameField()).toHaveAccessibleDescription(/Enter a name/);
  await expect(onboarding.nameField()).toBeFocused();

  await onboarding.nameField().fill('Zara O’Brien');
  await onboarding.next();

  await expect(page).toHaveURL(/\/onboarding\/sign-in$/);
  await expect(onboarding.heading()).toHaveText('How will Zara O’Brien sign in?');
  await expect(onboarding.stepLabel()).toHaveText('Step 3 of 5');
  await expect(onboarding.usernameField()).toHaveValue('zaraobrien');
  expect(onboarding.readerRequestCount()).toBe(0);

  await onboarding.back();
  await expect(page).toHaveURL(/\/onboarding\/child$/);
  await expect(onboarding.nameField()).toHaveValue('Zara O’Brien');
});

test('Given the sign-in step, when the username and password break the rules, then each field says what to fix and nothing is sent', async ({ page }) => {
  const onboarding = await startWizard(page);
  await onboarding.nameField().fill(ZARA.name);
  await onboarding.next();

  await onboarding.usernameField().fill('z!!');
  await onboarding.passwordField().fill('short');
  await onboarding.next();

  await expect(onboarding.problemSummary()).toContainText('Fix 2 things');
  await expect(onboarding.usernameField()).toHaveAccessibleDescription(/Letters, numbers, \. and _ only/);
  await expect(onboarding.passwordField()).toHaveAccessibleDescription(/At least 8 characters/);
  expect(onboarding.readerRequestCount()).toBe(0);
});

test('Given a username someone already has, when Next is pressed, then the field says so; with a free one the reader is created, listed in Settings and can sign in', async ({ page }) => {
  const onboarding = await startWizard(page);
  await onboarding.nameField().fill(ZARA.name);
  await onboarding.next();

  await onboarding.usernameField().fill('NIA');
  await onboarding.passwordField().fill(ZARA.password);
  await onboarding.next();
  await expect(onboarding.usernameField()).toHaveAccessibleDescription(/That username is taken/);
  await expect(onboarding.usernameField()).toHaveValue('NIA');

  await onboarding.usernameField().fill(ZARA.username);
  await onboarding.next();

  await expect(page).toHaveURL(/\/onboarding\/reward$/);
  await expect(onboarding.heading()).toHaveText('What will Zara read toward?');
  await expect(onboarding.stepLabel()).toHaveText('Step 4 of 5');

  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.reader('Zara')).toContainText('@zara');
  await settings.signOut();
  await new SignInPage(page).signInWithPassword(ZARA.username, ZARA.password);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Zara');
  expect(['rose', 'sky', 'sun', 'mint', 'lilac']).toContain(await new ShellPage(page).accountColour('Zara'));
});

test('Given the server cannot be reached, when Next is pressed, then the step says the reader wasn’t added and Try again sends it once more', async ({ page }) => {
  const onboarding = await startWizard(page);
  await onboarding.nameField().fill(ZARA.name);
  await onboarding.next();
  await onboarding.passwordField().fill(ZARA.password);
  await onboarding.breakReaders();

  await onboarding.next();

  await expect(onboarding.failure()).toContainText('Zara wasn’t added');
  await expect(onboarding.usernameField()).toHaveValue(ZARA.username);
  await onboarding.repairReaders();
  await onboarding.tryAgain();
  await expect(page).toHaveURL(/\/onboarding\/reward$/);
});

test('Given a request in flight, when Next is pressed again, then only one reader request is sent', async ({ page }) => {
  const onboarding = await startWizard(page);
  await onboarding.nameField().fill(ZARA.name);
  await onboarding.next();
  await onboarding.passwordField().fill(ZARA.password);
  await onboarding.slowReaders(800);

  await onboarding.next();
  await onboarding.pressNextAgain();

  await expect(page).toHaveURL(/\/onboarding\/reward$/);
  expect(onboarding.readerRequestCount()).toBe(1);
});

/** Priya signs up, adds Zara and reaches the reward step. */
async function reachRewardStep(page: Parameters<typeof signInAsDad>[0]) {
  const onboarding = await startWizard(page);
  await onboarding.nameField().fill(ZARA.name);
  await onboarding.next();
  await onboarding.passwordField().fill(ZARA.password);
  await onboarding.next();
  await page.waitForURL(/\/onboarding\/reward$/);
  return onboarding;
}

test('Given the reward step, when an example is tapped and Add another pressed, then the reward is listed and the fields clear; Next with empty fields goes on without sending more', async ({ page }) => {
  const onboarding = await reachRewardStep(page);
  await expect(onboarding.backLink()).toHaveCount(0);

  await onboarding.tapExample('Trip to the zoo');
  await expect(onboarding.rewardField()).toHaveValue('Trip to the zoo');
  await onboarding.booksField().fill('3');
  await onboarding.addAnother();

  await expect(onboarding.rewardsAdded()).toHaveCount(1);
  await expect(onboarding.rewardsAdded().first()).toContainText('Trip to the zoo');
  await expect(onboarding.rewardsAdded().first()).toContainText('3 books');
  await expect(onboarding.rewardField()).toHaveValue('');
  await expect(onboarding.booksField()).toHaveValue('');
  await expect(page).toHaveURL(/\/onboarding\/reward$/);

  await onboarding.next();
  await expect(page).toHaveURL(/\/onboarding\/done$/);
  expect(onboarding.rewardRequestCount()).toBe(1);

  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.galleryReward('Trip to the zoo')).toBeVisible();
});

test('Given a reward typed on the step, when Next is pressed, then it is saved and All set opens', async ({ page }) => {
  const onboarding = await reachRewardStep(page);

  await onboarding.rewardField().fill('Movie night');
  await onboarding.booksField().fill('2');
  await onboarding.next();

  await expect(page).toHaveURL(/\/onboarding\/done$/);
  expect(onboarding.rewardRequestCount()).toBe(1);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.galleryReward('Movie night')).toContainText('2 books');
});

test('Given no reward yet and an empty name with too many books, when Next or Add another is pressed, then each field says what to fix and nothing is sent', async ({ page }) => {
  const onboarding = await reachRewardStep(page);

  await onboarding.booksField().fill('25');
  await onboarding.next();

  await expect(onboarding.problemSummary()).toContainText('Fix 2 things');
  await expect(onboarding.rewardField()).toHaveAccessibleDescription(/Name the reward/);
  await expect(onboarding.booksField()).toHaveAccessibleDescription(/1 to 20/);
  await onboarding.addAnother();
  await expect(page).toHaveURL(/\/onboarding\/reward$/);
  expect(onboarding.rewardRequestCount()).toBe(0);
});

test('Given the server cannot be reached, when a reward is saved, then the step says it wasn’t added and Try again saves it', async ({ page }) => {
  const onboarding = await reachRewardStep(page);
  await onboarding.rewardField().fill('New book');
  await onboarding.booksField().fill('1');
  await onboarding.breakRewards();

  await onboarding.addAnother();

  await expect(onboarding.failure()).toContainText('New book wasn’t added');
  await expect(onboarding.rewardField()).toHaveValue('New book');
  await onboarding.repairRewards();
  await onboarding.tryAgain();
  await expect(onboarding.rewardsAdded()).toHaveCount(1);
});

test('Given the reward added, when All set opens, then it shows Zara’s username and password once, keeps them out of storage, and Go to my shelf opens Review for good', async ({ page, browser, baseURL }) => {
  const onboarding = await reachRewardStep(page);
  await onboarding.tapExample('Trip to the zoo');
  await onboarding.booksField().fill('3');
  await onboarding.next();

  await expect(page).toHaveURL(/\/onboarding\/done$/);
  await expect(onboarding.stepLabel()).toHaveText('Step 5 of 5');
  await expect(onboarding.heading()).toHaveText('All set!');
  await expect(onboarding.detail('Username')).toHaveText(ZARA.username);
  await expect(onboarding.detail('Password')).toHaveText(ZARA.password);
  await expect(onboarding.skipLink()).toHaveCount(0);
  await expect(onboarding.backLink()).toHaveCount(0);
  expect(await onboarding.storedAnywhere(ZARA.password)).toBe(false);

  await onboarding.goToMyShelf();

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.reader('Zara')).toContainText('@zara');
  await expect(settings.galleryReward('Trip to the zoo')).toContainText('3 books');
  await onboarding.open('done');
  await expect(page).toHaveURL(/\/review$/);

  const laptop = await browser.newContext({ baseURL });
  const other = await laptop.newPage();
  await new SignInPage(other).open();
  await new SignInPage(other).signInWithPassword(PRIYA.username, PRIYA.password);
  await expect(other).toHaveURL(/\/review$/);
  await laptop.close();
});
