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
import { RouterLink } from '@angular/router';
import { ChapterRow, Cover, Progress } from 'components';
import { BookResponse, ChapterSummary, ShelfApi } from '../shelf-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'sh-book-page',
  imports: [ChapterRow, Cover, DatePipe, Progress, RouterLink],
  templateUrl: './book-page.html',
  styleUrl: './book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookPage {
  private readonly api = inject(ShelfApi);

  /** Route parameter. */
  readonly id = input.required<string>();
  protected readonly book = signal<BookResponse | null>(null);
  protected readonly next = computed(
    () => this.book()?.chapters.find((c) => c.state === 'next') ?? null,
  );

  constructor() {
    effect(() => {
      const id = this.id();
      this.book.set(null);
      this.api.book(id).then((book) => this.book.set(book));
    });
  }

  protected whenRead(book: BookResponse, chapter: ChapterSummary) {
    const readOn = chapter.log!.readOn;
    if (readOn === book.today) return 'Today';
    if (readOn === addDays(book.today, -1)) return 'Yesterday';
    return null;
  }
}
