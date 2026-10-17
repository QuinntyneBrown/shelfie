import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover, EmptyState } from 'components';
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
  imports: [Cover, DatePipe, EmptyState, RouterLink],
  templateUrl: './books-page.html',
  styleUrl: './books-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksPage {
  protected readonly list = signal<BookList | null>(null);

  constructor() {
    inject(BooksApi)
      .list()
      .then((list) => this.list.set(list));
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
