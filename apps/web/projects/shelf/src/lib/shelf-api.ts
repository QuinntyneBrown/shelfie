import { Injectable, inject } from '@angular/core';
import { ApiClient, ApiError } from 'core';

/** The last shelf seen on this device, shown when there is no connection. */
const CACHE_KEY = 'shelfie.shelf';

export interface ChapterSummary {
  number: number;
  state: 'logged' | 'next' | 'future';
  log: { id: string; readOn: string; firstLine: string; reviewSticker: string | null } | null;
}

export interface BookResponse {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  loggedCount: number;
  finishedAt: string | null;
  finishedOn: string | null;
  reward: { text: string; givenOn: string } | null;
  today: string;
  grownUpName: string;
  chapters: ChapterSummary[];
}

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

export interface UnseenFeedback {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  chapterNumber: number;
  sticker: string;
}

export interface ShelfResponse {
  unseenFeedback: UnseenFeedback[];
  streak: number;
  grownUpName: string;
  reading: ShelfBook[];
  upNext: ShelfBook[];
  finished: FinishedBook[];
}

@Injectable({ providedIn: 'root' })
export class ShelfApi {
  private readonly api = inject(ApiClient);

  book(id: string) {
    return this.api.get<BookResponse>(`/books/${id}`);
  }

  addBook(book: NewBook) {
    return this.api.post<{ id: string }>('/books', book);
  }

  async shelf(): Promise<ShelfResponse> {
    try {
      const shelf = await this.api.get<ShelfResponse>('/shelf');
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(shelf));
      } catch {
        // Without storage there is simply no offline copy.
      }
      return shelf;
    } catch (e) {
      const cached = e instanceof ApiError && e.status === 0 ? readCache() : null;
      if (cached) return cached;
      throw e;
    }
  }
}

function readCache(): ShelfResponse | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? (JSON.parse(stored) as ShelfResponse) : null;
  } catch {
    return null;
  }
}
