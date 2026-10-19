// Traces to: L2-121, L2-122, L2-123, L2-124, L2-128
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';
import { pushDevicesOf } from '../support/database';
import { givenBrowserPush } from '../support/push';

const CHAPTER = 'Tell me when Nia logs a chapter';
const STICKER = 'Tell Nia when I send a sticker or note';

test('Given the server has no push keys, when Dad opens Settings, then the Notifications card says so and has no switches', async ({ page }) => {
  await givenBrowserPush(page, { permission: 'default' });
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await expect(settings.notSetUp()).toBeVisible();
  await expect(settings.deviceSwitch()).toHaveCount(0);
  await expect(settings.choice(CHAPTER)).toHaveCount(0);
});

test.describe('with push set up', () => {
  test.use({ push: 'on' });

  test('Given the browser has not been asked, when Dad turns this device on and allows it, then a toast says so, the switch stays on, and it is still on after a reload', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();
    await expect(settings.deviceSwitch()).not.toBeChecked();
    expect(await pushDevicesOf('dad')).toEqual([]);

    await settings.turnOnThisDevice();

    await expect(settings.toast('Notifications are on')).toBeVisible();
    await expect(settings.deviceSwitch()).toBeChecked();
    expect(await pushDevicesOf('dad')).toHaveLength(1);
    await page.reload();
    await expect(settings.deviceSwitch()).toBeChecked();
  });

  test('Given this device is on, when Dad turns it off, then the subscription is deleted and the switch is off', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();
    await settings.turnOnThisDevice();
    await expect(settings.toast('Notifications are on')).toBeVisible();

    await settings.turnOffThisDevice();

    await expect(settings.deviceSwitch()).not.toBeChecked();
    await expect.poll(() => pushDevicesOf('dad')).toEqual([]);
  });

  test('Given the browser has blocked notifications, when Dad opens Settings, then the switch is disabled and the card says where to allow them', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'denied' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();

    await expect(settings.blockedWarning()).toBeVisible();
    await expect(settings.deviceSwitch()).toBeDisabled();
    await expect(settings.deviceSwitch()).not.toBeChecked();
  });

  test('Given the browser asks, when Dad declines, then nothing is stored and the switch is off; the browser is never asked on load', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'denied' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();
    await expect(settings.deviceSwitch()).toBeEnabled();
    expect(await page.evaluate(() => Notification.permission)).toBe('default');

    await settings.turnOnThisDevice();

    await expect(settings.deviceSwitch()).not.toBeChecked();
    await expect(settings.blockedWarning()).toBeVisible();
    expect(await pushDevicesOf('dad')).toEqual([]);
  });

  test('Given the four choices start on, when Dad turns one off and saves, then it is still off after a reload and the others are on', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();
    for (const label of [CHAPTER, STICKER, 'Tell Nia when I give a book reward', 'Tell Nia when I give a streak reward']) {
      await expect(settings.choice(label)).toBeChecked();
    }

    await settings.choice(STICKER).uncheck();
    await settings.save();
    await expect(settings.banner()).toBeVisible();
    await page.reload();

    await expect(settings.choice(STICKER)).not.toBeChecked();
    await expect(settings.choice(CHAPTER)).toBeChecked();
  });

  test('Given this device is on, when Dad signs out, then its subscription is deleted first', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();
    await settings.turnOnThisDevice();
    await expect(settings.toast('Notifications are on')).toBeVisible();
    expect(await pushDevicesOf('dad')).toHaveLength(1);

    await settings.signOut();

    expect(await pushDevicesOf('dad')).toEqual([]);
  });

  test('Given the Notifications card, then the keyboard turns a switch on and an accessibility scan finds nothing serious', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default' });
    await signInAsDad(page);
    const settings = new SettingsPage(page);
    await settings.open();

    await settings.choice(CHAPTER).focus();
    await page.keyboard.press('Space');
    await expect(settings.choice(CHAPTER)).not.toBeChecked();

    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});

test('Given the server has no push keys, when Nia opens her shelf, then no offer shows', async ({ page }) => {
  await givenBrowserPush(page, { permission: 'default' });
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.greeting()).toBeVisible();
  await expect(shelf.pushOffer()).toHaveCount(0);
});

test.describe('the offer on the shelf', () => {
  test.use({ push: 'on' });

  test('Given the browser has not been asked, when Nia opens her shelf, then the offer shows, and Turn on stores her device, thanks her and hides the offer', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);

    await expect(shelf.pushOffer()).toContainText('Want a ping when Dad sends a sticker?');
    expect(await pushDevicesOf('nia')).toEqual([]);
    await shelf.turnOnNotifications();

    await expect(shelf.toast('Notifications are on')).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
    expect(await pushDevicesOf('nia')).toHaveLength(1);
    await page.reload();
    await expect(shelf.greeting()).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
  });

  test('Given the offer, when Nia chooses Not now, then it goes, nothing is stored, and it stays away after a reload', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);
    await expect(shelf.pushOffer()).toBeVisible();

    await shelf.notNow();

    await expect(shelf.pushOffer()).toHaveCount(0);
    await page.reload();
    await expect(shelf.greeting()).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
    expect(await pushDevicesOf('nia')).toEqual([]);
  });

  test('Given the offer, when the browser prompt is declined, then the offer goes and nothing is stored', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'denied' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);

    await shelf.turnOnNotifications();

    await expect(shelf.pushOffer()).toHaveCount(0);
    expect(await pushDevicesOf('nia')).toEqual([]);
  });

  test('Given the browser has blocked notifications, or Nia\'s device is already on, when she opens her shelf, then no offer shows', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'denied' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);
    await expect(shelf.greeting()).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
  });

  test('Given a device that is already on, when Nia opens her shelf again, then no offer shows', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);
    await shelf.turnOnNotifications();
    await expect(shelf.toast('Notifications are on')).toBeVisible();

    await page.goto('/shelf');

    await expect(shelf.greeting()).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
  });

  test('Given a parent, when Dad opens the shelf, then no offer shows', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default' });
    await signInAsDad(page);
    await page.goto('/shelf');
    const shelf = new ShelfPage(page);

    await expect(shelf.greeting()).toBeVisible();
    await expect(shelf.pushOffer()).toHaveCount(0);
  });

  test('Given the subscription cannot be stored, when Nia turns on, then a warning toast says so and the offer stays', async ({ page }) => {
    await givenBrowserPush(page, { permission: 'default', answer: 'granted' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);
    await shelf.breakStoringSubscriptions();

    await shelf.turnOnNotifications();

    await expect(shelf.toast('Couldn’t turn notifications on. Try again.')).toBeVisible();
    await expect(shelf.pushOffer()).toBeVisible();
    expect(await pushDevicesOf('nia')).toEqual([]);
  });

  test('Given the offer on a phone, then nothing scrolls sideways and an accessibility scan finds nothing serious', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await givenBrowserPush(page, { permission: 'default' });
    await signInAsNia(page);
    const shelf = new ShelfPage(page);
    await expect(shelf.pushOffer()).toBeVisible();

    expect(await shelf.scrollsSideways()).toBe(false);
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
