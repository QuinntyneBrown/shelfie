import type { Page } from '@playwright/test';

export class SignInPage {
  private passwordRequests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/password')) this.passwordRequests++;
    });
  }

  passwordRequestCount() {
    return this.passwordRequests;
  }

  async open() {
    await this.page.goto('/sign-in');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  usernameField() {
    return this.page.getByLabel('Username');
  }

  passwordField() {
    return this.page.getByLabel('Password', { exact: true });
  }

  keepMeSignedIn() {
    return this.page.getByRole('checkbox', { name: 'Keep me signed in' });
  }

  failureSummary() {
    return this.page.getByRole('alert');
  }

  signInButton() {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  async fillCredentials(username: string, password: string) {
    await this.usernameField().fill(username);
    await this.passwordField().fill(password);
  }

  async signInWithPassword(username: string, password: string, { remember = true } = {}) {
    await this.fillCredentials(username, password);
    await this.keepMeSignedIn().setChecked(remember);
    await this.signInButton().click();
  }

  async pressSignIn() {
    await this.signInButton().click();
  }

  async submitWithEnter() {
    await this.passwordField().press('Enter');
  }

  async showPassword() {
    await this.page.getByRole('button', { name: 'Show password' }).click();
  }

  /** Holds the password sign-in response until the returned function is called. */
  async holdPasswordResponse() {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/auth/password', async (route) => {
      await gate;
      await route.continue();
    });
    return release;
  }

  async breakPasswordRequests() {
    await this.page.route('**/api/auth/password', (route) => route.abort());
  }

  async repairPasswordRequests() {
    await this.page.unroute('**/api/auth/password');
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  signedOutNotice() {
    return this.page.getByRole('status').filter({ hasText: 'You were signed out' });
  }

  async chooseForgotPassword() {
    await this.page.getByRole('link', { name: 'Forgot your password?' }).click();
  }

  async chooseCreateAccount() {
    await this.page.getByRole('link', { name: 'Create a parent account' }).click();
  }
}
