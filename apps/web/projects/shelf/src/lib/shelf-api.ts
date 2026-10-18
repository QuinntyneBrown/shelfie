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
  coverImage: string | null;
  loggedCount: number;
  finishedAt: string | null;
  finishedOn: string | null;
  reward: { text: string; givenOn: string } | null;
  today: string;
  grownUpName: string;
  chapters: ChapterSummary[];
}

/** A book the lookup offers for the typed title; `suggested` marks a guess from the AI helper. */
export interface BookMatch {
  title: string;
  author: string | null;
  chapterCount: number | null;
  coverId: string | null;
  /** Lists the book's other catalogue covers; null for a guess. */
  workKey: string | null;
  suggested: boolean;
}

/** Where a catalogue cover is loaded from: the API fetches and re-encodes it; the browser never calls the catalogue. */
export const catalogueCoverUrl = (coverId: string) => `/api/books/search/covers/${coverId}`;

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
  coverImage: string | null;
  loggedCount: number;
  nextChapter: number;
}

export interface FinishedBook {
  id: string;
  title: string;
  coverColor: string;
  sticker: string;
  coverImage: string | null;
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

export interface GalleryReward {
  id: string;
  name: string;
  target: number;
}

/** The reward she is reading toward; `finished` counts the books since she picked it. */
export interface Goal {
  rewardId: string;
  name: string;
  target: number;
  finished: number;
  reached: boolean;
  bookId: string | null;
}

export interface GalleryView {
  rewards: GalleryReward[];
  goal: Goal | null;
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

  /** A book page seen before stays readable offline, from the copy kept on this device. */
  async book(id: string): Promise<BookResponse> {
    const key = `shelfie.book.${id}`;
    try {
      const book = await this.api.get<BookResponse>(`/books/${id}`);
      writeCache(key, book);
      return book;
    } catch (e) {
      const cached = e instanceof ApiError && e.status === 0 ? readCache<BookResponse>(key) : null;
      if (cached) return cached;
      throw e;
    }
  }

  addBook(book: NewBook) {
    return this.api.post<{ id: string }>('/books', book);
  }

  /** Looks a typed title up; aborting the signal drops a lookup that is no longer wanted. */
  searchBooks(title: string, signal: AbortSignal) {
    return this.api.get<{ matches: BookMatch[] }>(`/books/search?q=${encodeURIComponent(title)}`, {
      signal,
    });
  }

  /** The ids of the other covers the catalogue holds for a book's work, for the cover gallery. */
  async catalogueCovers(workKey: string): Promise<number[]> {
    const { covers } = await this.api.get<{ covers: number[] }>(
      `/books/search/covers?work=${encodeURIComponent(workKey)}`,
    );
    return covers;
  }

  /** A catalogue cover as a file, so it travels the same way as a picture chosen from the device. */
  async catalogueCover(coverId: string): Promise<File> {
    const blob = await this.api.blob(`/books/search/covers/${coverId}`);
    return new File([blob], 'cover.webp', { type: 'image/webp' });
  }

  /** Uploads a book's cover picture and returns its URL. */
  addCover(bookId: string, file: File) {
    return this.api.put<{ coverImage: string }>(`/books/${bookId}/cover`, file);
  }

  gallery() {
    return this.api.get<GalleryView>('/gallery-rewards');
  }

  /** Makes a gallery reward her goal, counting from now, and returns the gallery as it now stands. */
  pickGoal(id: string) {
    return this.api.post<GalleryView>(`/gallery-rewards/${id}/pick`, {});
  }

  async shelf(): Promise<ShelfResponse> {
    try {
      const shelf = await this.api.get<ShelfResponse>('/shelf');
      writeCache(CACHE_KEY, shelf);
      return shelf;
    } catch (e) {
      const cached =
        e instanceof ApiError && e.status === 0 ? readCache<ShelfResponse>(CACHE_KEY) : null;
      if (cached) return cached;
      throw e;
    }
  }
}

function readCache<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage there is simply no offline copy.
  }
}
