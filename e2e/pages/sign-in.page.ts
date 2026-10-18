import type { Page } from '@playwright/test';
import { SAME_SITE } from '../support/same-site';

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

  emailField() {
    return this.page.getByLabel('Email');
  }

  passwordField() {
    return this.page.getByLabel('Password');
  }

  failureSummary() {
    return this.page.getByRole('alert');
  }

  async fillCredentials(email: string, password: string) {
    await this.emailField().fill(email);
    await this.passwordField().fill(password);
  }

  async submitWithEnter() {
    await this.passwordField().press('Enter');
  }

  signInButton() {
    return this.page.getByRole('button', { name: 'Sign in' });
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

  async pressSignIn() {
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async open() {
    await this.page.goto('/sign-in');
  }

  async signInWithPassword(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  pickerHeading() {
    return this.page.getByRole('heading', { name: 'Who’s reading today?' });
  }

  signedOutNotice() {
    return this.page.getByRole('status').filter({ hasText: 'You were signed out' });
  }

  async chooseGrownUp(name: string) {
    await this.page.getByRole('button', { name: new RegExp(`^${name} Grown-up`) }).click();
  }

  signingInAs() {
    return this.page.getByText(/Signing in as/);
  }

  async chooseForgotPassword() {
    await this.page.getByRole('link', { name: 'Forgot your password?' }).click();
  }

  async typePasswordAndSignIn(password: string) {
    await this.passwordField().fill(password);
    await this.signInButton().click();
  }

  async choose(name: string) {
    await this.page.getByRole('button', { name: new RegExp(`^${name} Reader`) }).click();
    await this.page.getByRole('group', { name: 'PIN keypad' }).waitFor();
  }

  async enterPin(pin: string) {
    const keypad = this.page.getByRole('group', { name: 'PIN keypad' });
    for (const digit of pin) await keypad.getByRole('button', { name: digit, exact: true }).click();
  }

  async typePin(text: string) {
    await this.page.keyboard.type(text);
  }

  async deleteLastDigit() {
    await this.page.getByRole('button', { name: 'Delete last digit' }).click();
  }

  /** Enters a wrong PIN `count` times, waiting for each answer before the next try. */
  async failPin(count: number) {
    for (let attempt = 1; attempt <= count; attempt++) {
      await this.enterPin('9999');
      const left = 5 - attempt;
      await this.page.getByText(left > 0 ? new RegExp(`${left} tr(y|ies) left`) : /take a short break/).waitFor();
    }
  }

  lockNotice() {
    return this.page.getByRole('status').filter({ hasText: 'take a short break' });
  }

  digitButton(digit: string) {
    return this.page.getByRole('group', { name: 'PIN keypad' }).getByRole('button', { name: digit, exact: true });
  }

  /** Width and height of every digit key on the keypad, in key order. */
  async digitKeySizes() {
    const sizes = [];
    for (const digit of '1234567890') sizes.push(await this.digitButton(digit).boundingBox());
    return sizes.map((box) => ({ width: Math.round(box!.width), height: Math.round(box!.height) }));
  }

  /** Posts a PIN straight to the API, as a client that skips the keypad would. */
  async postPin(profileName: string, pin: string) {
    const profiles = await (await this.page.request.get('/api/auth/profiles')).json();
    const profile = profiles.find((p: { name: string }) => p.name === profileName);
    return this.page.request.post('/api/auth/pin', { ...SAME_SITE, data: { profileId: profile.id, pin } });
  }

  pinError() {
    return this.page.getByText(/That PIN didn’t match/);
  }

  digitsEntered(count: number) {
    return this.page.getByRole('status', { name: `${count} of 4 digits entered` });
  }
}
