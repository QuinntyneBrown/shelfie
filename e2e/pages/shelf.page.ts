import type { Page } from '@playwright/test';

export class ShelfPage {
  constructor(private readonly page: Page) {}

  greeting() {
    return this.page.getByRole('heading', { level: 1 });
  }

  group(name: 'On the go' | 'Up next' | 'Finished') {
    return this.page.getByRole('region', { name });
  }

  book(group: 'On the go' | 'Up next', title: string) {
    return this.group(group).getByRole('article').filter({ hasText: title });
  }

  finishedBook(title: string) {
    return this.group('Finished').getByRole('listitem').filter({ hasText: title });
  }

  cover(group: 'On the go' | 'Up next', title: string) {
    return this.book(group, title).locator('.cover');
  }
}
