import type { Page } from '@playwright/test';

/** The Forbidden, Not found and Something went wrong pages. */
export class ErrorPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  homeLink(name: 'Back to my shelf' | 'Go to Review' | 'Back to my profile') {
    return this.page.getByRole('link', { name });
  }

  codeShown() {
    return this.page.getByText(/SHF-[0-9A-F]{4}/);
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  /** Makes matching API requests fail the way an unexpected server error does. */
  async breakServer(urlGlob: string) {
    await this.page.route(urlGlob, (route) =>
      route.fulfill({ status: 500, json: { type: 'about:blank', title: 'Something went wrong', status: 500, requestId: 'SHF-1A2B' } }),
    );
  }

  async repairServer(urlGlob: string) {
    await this.page.unroute(urlGlob);
  }

  async backToShelf() {
    await this.page.getByRole('link', { name: 'Back to my shelf' }).click();
  }

  async signOut() {
    await this.page.getByRole('button', { name: 'Sign out' }).click();
  }
}
