import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface QueueItem {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  coverColor: string;
  coverSticker: string;
  coverImage: string | null;
  chapterNumber: number;
  readOn: string;
}

export interface FinishedBook {
  bookId: string;
  title: string;
  coverColor: string;
  coverSticker: string;
  coverImage: string | null;
  chapterCount: number;
  finishedOn: string;
}

export interface ActivityItem {
  kind: 'chapter-logged' | 'book-added' | 'sticker-given' | 'book-finished';
  at: string;
  bookId: string;
  bookTitle: string;
  chapterNumber: number | null;
  sticker: string | null;
  byRole: 'reader' | 'parent';
}

export interface ChapterLog {
  id: string;
  book: { id: string; title: string; coverColor: string; sticker: string; coverImage: string | null; chapterCount: number };
  chapterNumber: number;
  readOn: string;
  today: string;
  readerName: string;
  answers: { position: number; questionText: string; text: string }[];
  review: {
    sticker: string;
    note: string | null;
    reviewedAt: string;
    feedbackSeenAt: string | null;
  } | null;
}

export interface FeedbackResult {
  next: QueueItem | null;
  queueCount: number;
}

export interface ReviewOverview {
  activity: ActivityItem[];
  readerName: string;
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  thisWeek: { chapters: number; streak: number };
}

@Injectable({ providedIn: 'root' })
export class ReviewApi {
  private readonly api = inject(ApiClient);

  chapterLog(id: string) {
    return this.api.get<ChapterLog>(`/chapter-logs/${id}`);
  }

  sendFeedback(id: string, body: { sticker: string; note: string }) {
    return this.api.post<FeedbackResult>(`/chapter-logs/${id}/feedback`, body);
  }

  giveReward(bookId: string, body: { text: string; note: string }) {
    return this.api.post<{ bookId: string; text: string }>(`/books/${bookId}/reward`, body);
  }

  load() {
    return this.api.get<ReviewOverview>('/review');
  }
}
