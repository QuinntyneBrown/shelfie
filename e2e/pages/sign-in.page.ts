import type { Page } from '@playwright/test';

export class SignInPage {
  private passwordRequests = 0;
  private providerStarts = 0;

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
    // After a sign-out the previous page can still be on screen for a moment, with fields of its own.
    await this.page.waitForURL(/\/sign-in(\?|$)/);
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

  async chooseJoin() {
    await this.page.getByRole('link', { name: 'Join as an author or volunteer' }).click();
  }

  /** The "Continue with Google" or "Continue with Facebook" button below the form. */
  continueWithButton(provider: 'Google' | 'Facebook') {
    return this.page.getByRole('button', { name: `Continue with ${provider}` });
  }

  /** The line that introduces the provider buttons to parents. */
  parentsCanAlso() {
    return this.page.getByText('Parents can also');
  }

  async continueWith(provider: 'Google' | 'Facebook', { remember = true } = {}) {
    await this.page.waitForURL(/\/sign-in(\?|$)/);
    await this.keepMeSignedIn().setChecked(remember);
    // The click starts a top-level navigation to the API; a test may hold it to look at the button, so do not wait for it here.
    await this.continueWithButton(provider).click({ noWaitAfter: true });
  }

  /** Answers the start of the provider round trip with a download instead of a page, so the browser stays here with the button as it was left. */
  async swallowProviderStart() {
    await this.page.route('**/api/auth/*/start**', async (route) => {
      this.providerStarts++;
      await route.fulfill({ status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="nothing"' }, body: '' });
    });
  }

  providerStartCount() {
    return this.providerStarts;
  }

  /** The banner above the card after coming back from a provider. */
  providerBanner() {
    return this.page.getByRole('alert').or(this.page.getByRole('status')).filter({ hasText: /Google|Facebook|reader|cancelled|wrong|Too many/ });
  }
}
