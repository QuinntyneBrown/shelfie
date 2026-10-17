import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface BookListItem {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  loggedCount: number;
  finishedOn: string | null;
  reward: { text: string } | null;
}

export interface BookList {
  readerName: string;
  books: BookListItem[];
}

@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly api = inject(ApiClient);

  list() {
    return this.api.get<BookList>('/books');
  }
}
