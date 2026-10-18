// Traces to: L2-064, L2-068, L2-070
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { AddBookPage } from '../pages/add-book.page';

test('Given Nia types two letters, then nothing is looked up; given three and a pause, then the matching books drop down with their covers', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchLookups();
  await add.open();

  await add.typeTitle('Wi');
  await page.waitForTimeout(600);
  await expect(add.matchList()).toHaveCount(0);
  expect(add.lookupCount()).toBe(0);

  await add.typeTitle('Winn');

  await expect(add.matches()).toHaveText([/Because of Winn-Dixie\s*Kate DiCamillo/, /Read-Along Edition\s*Kate DiCamillo/, /Winnie-the-Pooh\s*A\. A\. Milne/]);
  await expect(add.activeMatch()).toContainText('Because of Winn-Dixie');
  await expect.poll(() => add.matchPictureLoaded('Because of Winn-Dixie')).toBe(true);
  await expect(add.matchPicture('Winnie-the-Pooh')).toHaveCount(0);
  await expect(add.titleField()).toBeFocused();
  expect(add.lookupCount()).toBe(1);
});

test('Given more than five books match, then only five are listed', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Winter');

  await expect(add.matches()).toHaveCount(5);
});

test('Given a match whose title holds markup, then it is shown as text', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Bold');

  await expect(add.match('<b>Bold</b> Title')).toContainText('<b>Bold</b> Title');
  await expect(add.match('<b>Bold</b> Title')).toContainText('<i>Emphatic</i> Author');
});

test('Given Nia keeps typing while a slow lookup is out, then only the answer to what she typed last is shown', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Slow');
  await page.waitForTimeout(400);
  await add.typeTitle('Winn');

  await expect(add.matches()).toHaveCount(3);
  await page.waitForTimeout(2000);
  await expect(add.matches()).toHaveCount(3);
  await expect(add.match('Slow Boat')).toHaveCount(0);
});

test('Given the list is open, then the Title is a combobox that names the list and its active row, and a screen reader hears the count', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Winn');
  await expect(add.matches()).toHaveCount(3);

  await expect(add.titleField()).toHaveAttribute('role', 'combobox');
  await expect(add.titleField()).toHaveAttribute('aria-autocomplete', 'list');
  await expect(add.titleField()).toHaveAttribute('autocomplete', 'off');
  await expect(add.titleField()).toHaveAttribute('aria-expanded', 'true');
  expect(await add.titleField().getAttribute('aria-controls')).toBe(await add.matchList().getAttribute('id'));
  expect(await add.titleField().getAttribute('aria-activedescendant')).toBe(await add.activeMatch().getAttribute('id'));
  await expect(add.lookupAnnouncement()).toHaveText('3 matches. Use the up and down arrows to pick one, or keep typing.');
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

test('Given the list is open, when Nia uses the arrow keys, then the active row moves and wraps; Escape closes it and keeps her text; Tab moves on', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchRequests();
  await add.open();
  await add.typeTitle('Winn');
  await expect(add.matches()).toHaveCount(3);

  await add.pressInTitle('ArrowDown');
  await expect(add.activeMatch()).toContainText('Read-Along Edition');
  await add.pressInTitle('ArrowDown');
  await add.pressInTitle('ArrowDown');
  await expect(add.activeMatch()).toContainText('Because of Winn-Dixie');
  await expect(add.activeMatch()).not.toContainText('Read-Along');
  await add.pressInTitle('ArrowUp');
  await expect(add.activeMatch()).toContainText('Winnie-the-Pooh');

  await add.pressInTitle('Escape');
  await expect(add.matchList()).toHaveCount(0);
  await expect(add.titleField()).toHaveValue('Winn');
  await expect(add.titleField()).toHaveAttribute('aria-expanded', 'false');
  await expect(add.titleField()).toBeFocused();

  await add.pressInTitle('ArrowDown');
  await expect(add.matches()).toHaveCount(3);
  await add.pressInTitle('Tab');
  await expect(add.matchList()).toHaveCount(0);
  await expect(add.authorField()).toBeFocused();
  expect(add.requestCount()).toBe(0);
});

test('Given the list is open, when Nia presses Enter, then the active match is picked, the list closes and the form is not submitted', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchRequests();
  await add.open();
  await add.typeTitle('Winn');
  await expect(add.matches()).toHaveCount(3);

  await add.pressInTitle('ArrowDown');
  await add.pressInTitle('Enter');

  await expect(add.matchList()).toHaveCount(0);
  await expect(add.titleField()).toHaveValue('Because of Winn-Dixie: Read-Along Edition');
  await expect(add.lookupAnnouncement()).toHaveText('Filled in from the match. Check the chapters.');
  expect(add.requestCount()).toBe(0);
  await expect(page).toHaveURL(/\/add-book$/);
});
