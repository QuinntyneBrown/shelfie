import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface BookListItem {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  coverImage: string | null;
  loggedCount: number;
  finishedOn: string | null;
  reward: { text: string } | null;
}

export interface ChapterSummary {
  number: number;
  state: 'logged' | 'next' | 'future';
  log: { id: string; readOn: string; firstLine: string; reviewSticker: string | null } | null;
}

export interface CustomQuestion {
  id: string;
  text: string;
  createdAt: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  coverImage: string | null;
  loggedCount: number;
  readerName: string;
  reward: { text: string; givenOn: string } | null;
  defaultQuestions: string[];
  questions: CustomQuestion[];
  chapters: ChapterSummary[];
}

/** Ideas for the book's next chapter; nothing is saved until the parent adds them. */
export interface QuestionSuggestions {
  chapter: number;
  suggestions: string[];
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

  addQuestion(bookId: string, text: string) {
    return this.api.post<CustomQuestion>(`/books/${bookId}/questions`, { text });
  }

  suggestQuestions(bookId: string) {
    return this.api.post<QuestionSuggestions>(`/books/${bookId}/question-suggestions`, {});
  }

  updateQuestion(id: string, text: string) {
    return this.api.patch<void>(`/questions/${id}`, { text });
  }

  removeQuestion(id: string) {
    return this.api.delete(`/questions/${id}`);
  }

  remove(id: string) {
    return this.api.delete(`/books/${id}`);
  }

  /** Uploads a book's cover picture and returns its URL. */
  uploadCover(id: string, file: File) {
    return this.api.put<{ coverImage: string }>(`/books/${id}/cover`, file);
  }

  removeCover(id: string) {
    return this.api.delete(`/books/${id}/cover`);
  }

  list() {
    return this.api.get<BookList>('/books');
  }
}
