import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface QueueItem {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  coverColor: string;
  coverSticker: string;
  chapterNumber: number;
  readOn: string;
}

export interface FinishedBook {
  bookId: string;
  title: string;
  coverColor: string;
  coverSticker: string;
  chapterCount: number;
  finishedOn: string;
}

export interface ReviewOverview {
  readerName: string;
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  thisWeek: { chapters: number; streak: number };
}

@Injectable({ providedIn: 'root' })
export class ReviewApi {
  private readonly api = inject(ApiClient);

  load() {
    return this.api.get<ReviewOverview>('/review');
  }
}
