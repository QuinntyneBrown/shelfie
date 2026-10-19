import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';
import type { LeaderboardRow } from 'components';

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

/** The review assistant's advice: shown to the parent only, never stored. */
export interface Advice {
  answers: { position: number; verdict: 'ok' | 'weak'; reason: string }[];
  draft: string;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  hint: string;
  earned: boolean;
  /** The day it was earned (YYYY-MM-DD); null while locked. */
  earnedOn: string | null;
}

export interface StreakReward {
  milestone: number;
  name: string | null;
  earnedOn: string | null;
  givenOn: string | null;
}

export interface ReviewOverview {
  activity: ActivityItem[];
  readerName: string;
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  /** The reader's reward-gallery goal; `bookId` is the finished book that reached it. */
  goal: { name: string; reached: boolean; bookId: string | null } | null;
  thisWeek: { chapters: number; streak: number };
  badges: Badge[];
  streakRewards: StreakReward[];
}

export interface Challenge {
  id: string;
  name: string;
  measure: 'chapters' | 'books';
  goal: number;
  startsOn: string;
  endsOn: string;
  daysLeft: number;
  ended: boolean;
  standings: LeaderboardRow[];
}

export interface ChallengeReader {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}

export interface Challenges {
  today: string;
  readers: ChallengeReader[];
  current: Challenge | null;
  past: Challenge[];
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

  assist(id: string) {
    return this.api.post<Advice>(`/chapter-logs/${id}/assist`, {});
  }

  giveStreakReward(milestone: number) {
    return this.api.post<StreakReward>(`/streak-rewards/${milestone}/give`, {});
  }

  giveReward(bookId: string, body: { text: string; note: string }) {
    return this.api.post<{ bookId: string; text: string }>(`/books/${bookId}/reward`, body);
  }

  load() {
    return this.api.get<ReviewOverview>('/review');
  }

  challenges() {
    return this.api.get<Challenges>('/challenges');
  }
}
