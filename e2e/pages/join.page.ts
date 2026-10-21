import type { Page } from '@playwright/test';

/** Join as an author or volunteer (`/join`). */
export class JoinPage {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/join')) this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  async open() {
    await this.page.goto('/join');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async chooseAuthor() {
    await this.page.getByRole('radio', { name: /I’m an author/ }).check();
  }

  async chooseVolunteer() {
    await this.page.getByRole('radio', { name: /I volunteer/ }).check();
  }

  nameField() {
    return this.page.getByLabel('Your name');
  }

  emailField() {
    return this.page.getByLabel('E-mail address');
  }

  usernameField() {
    return this.page.getByLabel('Username');
  }

  passwordField() {
    return this.page.getByRole('textbox', { name: 'Password', exact: true });
  }

  confirmField() {
    return this.page.getByRole('textbox', { name: 'Type it again' });
  }

  async fill(account: { name: string; email: string; username: string; password: string; confirm?: string }) {
    await this.nameField().fill(account.name);
    await this.emailField().fill(account.email);
    await this.usernameField().fill(account.username);
    await this.passwordField().fill(account.password);
    await this.confirmField().fill(account.confirm ?? account.password);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create my account' }).click();
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.page.getByRole('alert').filter({ hasText: 'Can’t reach Shelfie' });
  }

  async breakJoin() {
    await this.page.route('**/api/auth/join', (route) => route.abort());
  }

  async repairJoin() {
    await this.page.unroute('**/api/auth/join');
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }
}
