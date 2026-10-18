import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface ChapterForm {
  book: {
    id: string;
    title: string;
    author: string | null;
    chapterCount: number;
    coverColor: string;
    sticker: string;
    coverImage: string | null;
  };
  chapterNumber: number;
  /** Today in the household's time zone, as YYYY-MM-DD. */
  today: string;
  grownUpName: string;
  questions: { position: number; text: string; required: boolean }[];
}

export interface LogRequest {
  readOn: string;
  answers: { position: number; text: string }[];
}

export interface LogResult {
  chapterLogId: string;
  undoUntil: string;
  chaptersLogged: number;
  chapterCount: number;
  bookFinished: boolean;
}

export interface ChapterView {
  id: string;
  book: {
    id: string;
    title: string;
    coverColor: string;
    sticker: string;
    coverImage: string | null;
    chapterCount: number;
  };
  chapterNumber: number;
  readOn: string;
  today: string;
  grownUpName: string;
  answers: { position: number; questionText: string; text: string }[];
  review: {
    sticker: string;
    note: string | null;
    reviewedAt: string;
    feedbackSeenAt: string | null;
  } | null;
  nextChapterLogId: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChaptersApi {
  private readonly api = inject(ApiClient);

  chapter(chapterLogId: string) {
    return this.api.get<ChapterView>(`/chapter-logs/${chapterLogId}`);
  }

  markSeen(chapterLogId: string) {
    return this.api.post<void>(`/chapter-logs/${chapterLogId}/seen`, {});
  }

  form(bookId: string, n: number) {
    return this.api.get<ChapterForm>(`/books/${bookId}/chapters/${n}/form`);
  }

  undo(chapterLogId: string) {
    return this.api.delete(`/chapter-logs/${chapterLogId}`);
  }

  log(bookId: string, n: number, request: LogRequest) {
    return this.api.post<LogResult>(`/books/${bookId}/chapters/${n}`, request);
  }
}
