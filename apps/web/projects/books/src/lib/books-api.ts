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

export interface ChapterSummary {
  number: number;
  state: 'logged' | 'next' | 'future';
  log: { id: string; readOn: string; firstLine: string } | null;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  loggedCount: number;
  readerName: string;
  chapters: ChapterSummary[];
}

export interface BookPatch {
  title: string;
  author: string | null;
  chapterCount: number;
}

export interface BookList {
  readerName: string;
  books: BookListItem[];
}

@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly api = inject(ApiClient);

  get(id: string) {
    return this.api.get<BookDetail>(`/books/${id}`);
  }

  update(id: string, patch: BookPatch) {
    return this.api.patch<BookDetail>(`/books/${id}`, patch);
  }

  remove(id: string) {
    return this.api.delete(`/books/${id}`);
  }

  list() {
    return this.api.get<BookList>('/books');
  }
}
