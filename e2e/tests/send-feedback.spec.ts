// Traces to: L2-114, L2-115, L2-116, L2-117
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { storedFeedback } from '../support/database';
import { ShellPage } from '../pages/shell.page';
import { SendFeedbackDialog } from '../pages/send-feedback-dialog.page';

test.beforeEach(async ({ stack }) => {
  await stack.db.pool.query('DELETE FROM feedback');
});

test('Given Nia, when she sends a face, How it feels and a message from her account menu, then she is thanked and it is saved for her', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const feedback = new SendFeedbackDialog(page);

  await shell.openAccountMenu('Nia');
  expect(await shell.menuItemNames()).toEqual(['My photo', 'Send feedback', 'Sign out']);
  await shell.menuItem('Send feedback').click();
  await expect(feedback.scoreGroup()).toHaveAccessibleName(/How does Shelfie feel\?/);
  await feedback.pickFace('Love it');
  await feedback.write('I love the stickers!');
  await feedback.send();

  await expect(feedback.thanks()).toBeVisible();
  await expect(feedback.dialog()).toBeHidden();
  expect(await storedFeedback()).toEqual([{ household_id: 'h1', profile_id: 'p-nia', kind: 'feel', score: 5, message: 'I love the stickers!' }]);
});

test('Given Dad, when An idea is sent with only a message, then it is saved for Dad with no score', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  const feedback = new SendFeedbackDialog(page);

  await shell.openAccountMenu('Dad');
  expect(await shell.menuItemNames()).toEqual(['Settings', 'Send feedback', 'Sign out']);
  await shell.menuItem('Send feedback').click();
  await expect(feedback.scoreGroup()).toHaveAccessibleName(/How is Shelfie to use\?/);
  await feedback.chooseKind('An idea');
  await expect(feedback.message()).toHaveAccessibleName(/What would make Shelfie better\?/);
  await feedback.write('A weekly e-mail of what Nia read.');
  await feedback.send();

  await expect(feedback.thanks()).toBeVisible();
  expect(await storedFeedback()).toEqual([{ household_id: 'h1', profile_id: 'p-dad', kind: 'idea', score: null, message: 'A weekly e-mail of what Nia read.' }]);
});

test('Given the open dialog, when Escape or Cancel is used, then it closes, nothing is saved and it opens empty again', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const feedback = new SendFeedbackDialog(page);

  for (const close of [() => shell.press('Escape'), () => feedback.cancel()]) {
    await shell.openSendFeedback('Nia');
    await feedback.pickFace('Good');
    await feedback.chooseKind('An idea');
    await feedback.write('Half a thought');
    await close();
    await expect(feedback.dialog()).toBeHidden();
    await expect(shell.accountMenuButton('Nia')).toBeFocused();
  }

  await shell.openSendFeedback('Nia');
  await expect(feedback.face('Good')).not.toBeChecked();
  await expect(feedback.kind('How it feels')).toHaveAttribute('aria-pressed', 'true');
  await expect(feedback.message()).toHaveValue('');
  expect(await storedFeedback()).toEqual([]);
});

test('Given a phone, then the dialog fits without scrolling sideways, the faces move with the arrow keys and axe finds nothing serious', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const feedback = new SendFeedbackDialog(page);

  await shell.openSendFeedback('Nia');
  await feedback.pickFace('Not fun');
  await shell.press('ArrowRight');

  await expect(feedback.face('A bit meh')).toBeChecked();
  expect(await shell.scrollsSideways()).toBe(false);
  expect(await shell.seriousAccessibilityProblems()).toEqual([]);
});

test('Given nothing picked or typed, when Send is pressed, then it says to pick a face or write a message and sends nothing', async ({ page }) => {
  await signInAsNia(page);
  const feedback = new SendFeedbackDialog(page);
  feedback.watchSending();

  await new ShellPage(page).openSendFeedback('Nia');
  await feedback.write('   ');
  await feedback.send();

  await expect(feedback.banner()).toContainText('Fix 1 thing');
  await expect(feedback.scoreGroup()).toHaveAccessibleDescription(/Pick a face or write a message\./);
  expect(feedback.sendCount()).toBe(0);
});

test('Given a message over 1,000 characters, when Send is pressed, then it says how many too many, keeps it and sends nothing', async ({ page }) => {
  await signInAsNia(page);
  const feedback = new SendFeedbackDialog(page);
  feedback.watchSending();
  const long = 'I love Shelfie! '.repeat(64);

  await new ShellPage(page).openSendFeedback('Nia');
  await feedback.pickFace('Love it');
  await feedback.write(long);
  await feedback.send();

  await expect(feedback.banner()).toContainText('Fix 1 thing');
  await expect(feedback.message()).toHaveAccessibleDescription(/Keep it to 1,000 characters \(23 too many\)\./);
  await expect(feedback.message()).toHaveValue(long);
  expect(feedback.sendCount()).toBe(0);
});

test('Given a message being typed, then the help counts the characters left', async ({ page }) => {
  await signInAsNia(page);
  const feedback = new SendFeedbackDialog(page);

  await new ShellPage(page).openSendFeedback('Nia');
  await feedback.write('Dragons!');

  await expect(feedback.message()).toHaveAccessibleDescription('Up to 1,000 characters · 992 left');
});

test('Given sending is slow, then Send is busy, the fields and Cancel are locked and a second press sends nothing more', async ({ page }) => {
  await signInAsNia(page);
  const feedback = new SendFeedbackDialog(page);
  feedback.watchSending();
  const release = await feedback.holdSending();

  await new ShellPage(page).openSendFeedback('Nia');
  await feedback.pickFace('Good');
  await feedback.write('Fun!');
  await feedback.send();

  await expect(feedback.sendButton()).toHaveAttribute('aria-busy', 'true');
  await expect(feedback.sendButton()).toBeDisabled();
  await expect(feedback.face('Okay')).toBeDisabled();
  await expect(feedback.kind('An idea')).toBeDisabled();
  await expect(feedback.message()).toBeDisabled();
  await expect(feedback.dialog().getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await feedback.sendButton().click({ force: true });
  release();
  await expect(feedback.thanks()).toBeVisible();
  expect(feedback.sendCount()).toBe(1);
  expect(await storedFeedback()).toHaveLength(1);
});

test('Given the network fails, then the dialog says it wasn’t sent, keeps everything, and Try again sends it', async ({ page }) => {
  await signInAsNia(page);
  const feedback = new SendFeedbackDialog(page);
  await feedback.breakSending();

  await new ShellPage(page).openSendFeedback('Nia');
  await feedback.pickFace('Okay');
  await feedback.chooseKind('An idea');
  await feedback.write('More dragon books');
  await feedback.send();

  await expect(feedback.banner()).toContainText('Your feedback wasn’t sent');
  await expect(feedback.face('Okay')).toBeChecked();
  await expect(feedback.kind('An idea')).toHaveAttribute('aria-pressed', 'true');
  await expect(feedback.message()).toHaveValue('More dragon books');
  await feedback.repairSending();
  await feedback.tryAgain();

  await expect(feedback.thanks()).toBeVisible();
  expect(await storedFeedback()).toEqual([{ household_id: 'h1', profile_id: 'p-nia', kind: 'idea', score: 3, message: 'More dragon books' }]);
});

test('Given too many notes were sent, then the dialog shows the same failure and keeps everything', async ({ page }) => {
  await signInAsDad(page);
  const feedback = new SendFeedbackDialog(page);
  await feedback.limitSending();

  await new ShellPage(page).openSendFeedback('Dad');
  await feedback.pickFace('Good');
  await feedback.send();

  await expect(feedback.banner()).toContainText('Your feedback wasn’t sent');
  await expect(feedback.face('Good')).toBeChecked();
  await expect(feedback.dialog()).toBeVisible();
});
