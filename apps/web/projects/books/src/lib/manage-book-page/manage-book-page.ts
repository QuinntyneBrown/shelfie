import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button, Cover, Progress, TextField } from 'components';
import { ApiError } from 'core';
import { BookDetail, BooksApi } from '../books-api';

@Component({
  selector: 'sh-manage-book-page',
  imports: [Button, Cover, DatePipe, Progress, TextField],
  templateUrl: './manage-book-page.html',
  styleUrl: './manage-book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageBookPage {
  private readonly api = inject(BooksApi);
  private readonly router = inject(Router);

  /** Route parameter. */
  readonly id = input.required<string>();
  protected readonly book = signal<BookDetail | null>(null);
  protected readonly title = signal('');
  protected readonly author = signal('');
  protected readonly chapters = signal('');
  protected readonly titleError = signal<string | null>(null);
  protected readonly chaptersError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  /** Logged chapters, newest first. */
  protected readonly logged = computed(() =>
    (this.book()?.chapters ?? []).filter((c) => c.log !== null).reverse(),
  );

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  private async load(id: string) {
    try {
      this.show(await this.api.get(id));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
    }
  }

  private show(book: BookDetail) {
    this.book.set(book);
    this.title.set(book.title);
    this.author.set(book.author ?? '');
    this.chapters.set(String(book.chapterCount));
  }

  protected async save() {
    const book = this.book();
    if (!book || this.saving()) return;
    const chapters = Number(this.chapters());
    const floor = Math.max(1, book.loggedCount);
    this.titleError.set(this.title().trim() ? null : 'The book needs a title.');
    this.chaptersError.set(
      !Number.isInteger(chapters) || chapters > 200
        ? 'Enter a number from 1 to 200.'
        : chapters < floor
          ? book.loggedCount
            ? `Enter ${floor} or more. ${book.readerName} has already logged ${floor} chapters.`
            : 'Enter a number from 1 to 200.'
          : null,
    );
    if (this.titleError() || this.chaptersError()) return;

    this.saving.set(true);
    this.saved.set(false);
    try {
      this.show(
        await this.api.update(book.id, {
          title: this.title().trim(),
          author: this.author().trim() || null,
          chapterCount: chapters,
        }),
      );
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
