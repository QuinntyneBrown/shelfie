import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** The parts of the app that wrap every signed-in page: skip link, top bar and account menu. */
export class ShellPage {
  constructor(private readonly page: Page) {}

  skipLink() {
    return this.page.getByRole('link', { name: 'Skip to content' });
  }

  main() {
    return this.page.getByRole('main');
  }

  brand() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Shelfie' });
  }

  accountMenuButton(name: string) {
    return this.page.getByRole('button', { name: `Account menu for ${name}` });
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }

  /** Controls a finger could miss: anything interactive smaller than 44 × 44 CSS px. */
  async undersizedControls() {
    return this.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, a.btn, [role=menuitem], input, textarea, select, .chip')]
        .filter((el) => el.offsetParent !== null)
        // A radio or checkbox is hit through its label, so that is the target to measure.
        .map((el) => ({ el, box: (el.matches('input[type=radio], input[type=checkbox]') ? (el.closest('label') ?? el) : el).getBoundingClientRect() }))
        .filter(({ box }) => box.width < 44 || box.height < 44)
        .map(({ el, box }) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(box.width)}x${Math.round(box.height)}`),
    );
  }

  /** Accessibility problems axe rates serious or critical on the page as it is now. */
  async seriousAccessibilityProblems() {
    const { violations } = await new AxeBuilder({ page: this.page }).analyze();
    return violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  }

  async preferReducedMotion() {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
  }

  /** Longest transition or animation any visible control runs, in seconds. */
  async longestMotion() {
    return this.page.evaluate(() => {
      const seconds = (list: string) => Math.max(...list.split(',').map((s) => parseFloat(s) || 0));
      return Math.max(
        0,
        ...[...document.querySelectorAll<HTMLElement>('button, a, .progress__bar, .skeleton')].flatMap((el) => {
          const style = getComputedStyle(el);
          return [seconds(style.transitionDuration), seconds(style.animationDuration)];
        }),
      );
    });
  }

  /** The theme the page is drawn in: light or dark. */
  async theme() {
    return this.page.locator('html').getAttribute('data-theme');
  }

  async preferDarkDevice(dark: boolean) {
    await this.page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
  }

  /** The top bar links, shown from 768px for the grown-up. */
  topNav() {
    return this.page.getByRole('navigation', { name: 'Primary', exact: true });
  }

  /** The bottom tab bar, shown below 768px for the grown-up. */
  tabBar() {
    return this.page.getByRole('navigation', { name: 'Primary, phone' });
  }

  streakBadge() {
    return this.page.getByRole('banner').getByLabel(/-day reading streak$/);
  }

  queueBadge(where: 'top' | 'tab') {
    return (where === 'top' ? this.topNav() : this.tabBar()).getByLabel(/chapters? to review$/);
  }

  offlineBanner() {
    return this.page.getByRole('status').filter({ hasText: 'No internet connection' });
  }

  async goOffline() {
    await this.page.context().setOffline(true);
  }

  async goOnline() {
    await this.page.context().setOffline(false);
  }

  menu() {
    return this.page.getByRole('menu');
  }

  menuItem(name: string) {
    return this.page.getByRole('menuitem', { name });
  }

  async openAccountMenu(name: string) {
    await this.accountMenuButton(name).click();
  }

  async focusAccountMenuButton(name: string) {
    await this.accountMenuButton(name).focus();
  }

  async press(key: string) {
    await this.page.keyboard.press(key);
  }

  async clickOutsideMenu() {
    await this.page.mouse.click(5, 400);
  }
}
