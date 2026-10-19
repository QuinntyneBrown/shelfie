import type { Page } from '@playwright/test';

/** The one-time set-up wizard a parent sees after signing up: five full-screen steps under the auth layout. */
export class OnboardingPage {
  constructor(private readonly page: Page) {}

  async open(step?: 'child' | 'sign-in' | 'reward' | 'done') {
    await this.page.goto(step ? `/onboarding/${step}` : '/onboarding');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The "Step N of M" label of the step indicator. */
  stepLabel() {
    return this.page.getByText(/^Step \d of \d$/);
  }

  async letsGo() {
    await this.page.getByRole('link', { name: 'Let’s go' }).click();
  }

  async skipForNow() {
    await this.page.getByRole('link', { name: 'Skip for now' }).click();
  }

  skipLink() {
    return this.page.getByRole('link', { name: 'Skip for now' });
  }

  /** The shell's primary navigation, which the wizard never shows. */
  shellNavigation() {
    return this.page.getByRole('navigation', { name: /^Primary/ });
  }
}
