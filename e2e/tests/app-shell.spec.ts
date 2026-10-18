// Traces to: L2-025, L2-026
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SignInPage } from '../pages/sign-in.page';
import { screens } from '../support/screens';

test('Given Nia is signed in, when her shelf shows, then the top bar has the brand and her account menu', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await expect(shell.brand()).toBeVisible();
  await expect(shell.accountMenuButton('Nia')).toBeVisible();
  await expect(shell.main()).toHaveCount(1);
});

test('Given Nia is signed in, when she scrolls down a long page, then the top bar stays at the top of the window', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(shell.brand()).toBeVisible();

  expect(await shell.topBarOffsetAfterScrolling()).toBe(0);
});

test('Given nobody is signed in, when the sign-in page shows, then there is no top bar', async ({ page }) => {
  await new SignInPage(page).open();

  await expect(new ShellPage(page).accountMenuButton('Nia')).toBeHidden();
});

test('Given a keyboard user opens a page, when she presses Tab then Enter, then the skip link jumps to the main content', async ({ page }) => {
  await signInAsNia(page);
  await page.reload();
  const shell = new ShellPage(page);
  await expect(shell.accountMenuButton('Nia')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(shell.skipLink()).toBeFocused();
  await expect(shell.skipLink()).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(shell.main()).toBeFocused();
});

test('Given Nia moves to another page, when it shows, then keyboard focus is on its main content rather than lost', async ({ page }) => {
  await signInAsNia(page);

  await expect(new ShellPage(page).main()).toBeFocused();
});

test('Given Nia opens her account menu, then it names her and offers Sign out, and Escape closes it back to the avatar', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Nia');
  await expect(shell.menu()).toContainText('Nia');
  await expect(shell.menu()).toContainText('@nia');
  await expect(shell.menuItem('Sign out')).toBeVisible();
  await expect(shell.menuItem('Settings')).toBeHidden();

  await shell.press('Escape');
  await expect(shell.menu()).toBeHidden();
  await expect(shell.accountMenuButton('Nia')).toBeFocused();
});

test('Given the avatar has keyboard focus, when ArrowDown is pressed, then the menu opens on its first item and the arrow keys move and wrap', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);

  await shell.focusAccountMenuButton('Dad');
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Settings')).toBeFocused();
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Sign out')).toBeFocused();
  await shell.press('ArrowDown');
  await expect(shell.menuItem('Settings')).toBeFocused();
  await shell.press('ArrowUp');
  await expect(shell.menuItem('Sign out')).toBeFocused();
  await shell.press('Home');
  await expect(shell.menuItem('Settings')).toBeFocused();
  await shell.press('End');
  await expect(shell.menuItem('Sign out')).toBeFocused();
});

test('Given the avatar has keyboard focus, when Enter or Space is pressed, then the menu opens', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.focusAccountMenuButton('Nia');
  await shell.press('Enter');
  await expect(shell.menu()).toBeVisible();
  await shell.press('Escape');
  await shell.press('Space');
  await expect(shell.menu()).toBeVisible();
});

test('Given the menu is open, when she clicks elsewhere, then it closes', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Nia');
  await shell.clickOutsideMenu();

  await expect(shell.menu()).toBeHidden();
});

test('Given Nia is signed in, when she chooses Sign out, then her session ends and she sees the sign-in page', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Nia');
  await shell.menuItem('Sign out').click();

  await expect(new SignInPage(page).heading()).toHaveText('Welcome back');
  await page.goto('/shelf');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('Given Dad is signed in, when he opens his account menu, then it shows his username and role and offers Settings and Sign out', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);

  await shell.openAccountMenu('Dad');

  await expect(shell.menu()).toContainText('@dad · parent');
  await expect(shell.menuItem('Settings')).toBeVisible();
  await expect(shell.menuItem('Sign out')).toBeVisible();
});

for (const width of [360, 768, 1280]) {
  for (const screen of screens) {
    test(`Given a ${width}px screen, when ${screen.name} shows, then nothing scrolls sideways and every control is at least 44 by 44`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await screen.open(page);
      const shell = new ShellPage(page);

      expect(await shell.scrollsSideways()).toBe(false);
      expect(await shell.undersizedControls()).toEqual([]);
    });
  }
}

for (const screen of screens) {
  test(`Given ${screen.name} shows, then an accessibility scan finds nothing serious or critical`, async ({ page }) => {
    await screen.open(page);

    expect(await new ShellPage(page).seriousAccessibilityProblems()).toEqual([]);
  });
}

test('Given she prefers reduced motion, when the shelf shows, then no control animates', async ({ page }) => {
  await new ShellPage(page).preferReducedMotion();
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(shell.accountMenuButton('Nia')).toBeVisible();

  expect(await shell.longestMotion()).toBeLessThan(0.001);
});

test('Given she has no preference, when the shelf shows, then controls do animate', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(shell.accountMenuButton('Nia')).toBeVisible();

  expect(await shell.longestMotion()).toBeGreaterThan(0);
});

for (const screen of screens) {
  test(`Given a dark device, when ${screen.name} shows, then an accessibility scan still finds nothing serious or critical`, async ({ page }) => {
    const shell = new ShellPage(page);
    await shell.preferDarkDevice(true);
    await screen.open(page);
    await expect.poll(() => shell.theme()).toBe('dark');

    expect(await shell.seriousAccessibilityProblems()).toEqual([]);
  });
}
