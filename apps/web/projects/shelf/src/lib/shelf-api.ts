import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface NewBook {
  title: string;
  author: string;
  chapterCount: number;
  coverColor: string;
  sticker: string;
}

export interface ShelfBook {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  loggedCount: number;
  nextChapter: number;
}

export interface FinishedBook {
  id: string;
  title: string;
  coverColor: string;
  sticker: string;
  finishedOn: string;
  reward: { text: string; givenOn: string } | null;
}

export interface ShelfResponse {
  grownUpName: string;
  reading: ShelfBook[];
  upNext: ShelfBook[];
  finished: FinishedBook[];
}

@Injectable({ providedIn: 'root' })
export class ShelfApi {
  private readonly api = inject(ApiClient);

  addBook(book: NewBook) {
    return this.api.post<{ id: string }>('/books', book);
  }

  shelf() {
    return this.api.get<ShelfResponse>('/shelf');
  }
}
