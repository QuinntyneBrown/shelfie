import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover, EmptyState, Segmented } from 'components';
import { ApiError, ReaderChoiceService } from 'core';
import { BookList, BooksApi, BookListItem } from '../books-api';

type Status = 'rewarded' | 'reward-to-give' | 'not-started' | 'reading';

const STATUS_LABELS: Record<Status, string> = {
  rewarded: 'Rewarded',
  'reward-to-give': 'Reward to give',
  'not-started': 'Not started',
  reading: 'Reading',
};

@Component({
  selector: 'sh-books-page',
  imports: [Cover, DatePipe, EmptyState, RouterLink, Segmented],
  templateUrl: './books-page.html',
  styleUrl: './books-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksPage {
  protected readonly list = signal<BookList | null>(null);
  private readonly api = inject(BooksApi);
  private readonly readerChoice = inject(ReaderChoiceService);
  /** The picker's chips; none with a single reader (L2-138). */
  protected readonly readerOptions = computed(() => {
    const readers = this.list()?.readers ?? [];
    return readers.length > 1 ? readers.map((r) => ({ value: r.id, label: r.name })) : [];
  });

  constructor() {
    this.load();
  }

  private async load() {
    try {
      this.list.set(await this.api.list(this.readerChoice.query()));
    } catch (e) {
      // A remembered reader who is no longer in the household: forget her and show the first reader.
      if (!(e instanceof ApiError && e.status === 404 && this.readerChoice.selected())) throw e;
      this.readerChoice.choose(null);
      this.list.set(await this.api.list());
    }
  }

  protected pickReader(readerId: string) {
    if (readerId === this.list()?.readerId) return;
    this.readerChoice.choose(readerId);
    this.load();
  }

  protected status(book: BookListItem) {
    const status: Status = book.reward
      ? 'rewarded'
      : book.finishedOn
        ? 'reward-to-give'
        : book.loggedCount === 0
          ? 'not-started'
          : 'reading';
    return STATUS_LABELS[status];
  }
}
