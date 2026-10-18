import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityItem as ActivityLine, Cover, EmptyState, FEEDBACK_STICKERS } from 'components';
import { ShellStatusService, ToastService } from 'core';
import { GiveRewardDialog } from '../give-reward-dialog/give-reward-dialog';
import { ActivityItem, FinishedBook, QueueItem, ReviewApi, ReviewOverview } from '../review-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** From this many waiting chapters the summary gently notices the pile. */
const LONG_QUEUE = 10;

@Component({
  selector: 'sh-review-page',
  imports: [ActivityLine, Cover, DatePipe, EmptyState, GiveRewardDialog, RouterLink],
  templateUrl: './review-page.html',
  styleUrl: './review-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  private readonly toasts = inject(ToastService);
  protected readonly overview = signal<ReviewOverview | null>(null);
  protected readonly rewarding = signal<FinishedBook | null>(null);
  protected readonly summary = computed(() => {
    const overview = this.overview();
    if (!overview) return '';
    const chapters = overview.queue.length;
    const rewards = overview.finishedUnrewarded.length;
    const line = `${chapters} ${chapters === 1 ? 'chapter' : 'chapters'} to read · ${rewards} ${rewards === 1 ? 'reward' : 'rewards'} to give`;
    return chapters >= LONG_QUEUE ? `${line} · back from a week away?` : line;
  });

  constructor() {
    const status = inject(ShellStatusService);
    inject(ReviewApi)
      .load()
      .then((overview) => {
        this.overview.set(overview);
        status.queueCount.set(overview.queue.length);
      });
  }

  /** The goal's name when this finished book is the one that reached the reader's goal. */
  protected goalNameOf(overview: ReviewOverview, book: FinishedBook | null) {
    const goal = overview.goal;
    return goal?.reached && goal.bookId === book?.bookId ? goal.name : null;
  }

  protected rewarded(book: FinishedBook) {
    this.rewarding.set(null);
    this.overview.update(
      (o) =>
        o && {
          ...o,
          finishedUnrewarded: o.finishedUnrewarded.filter((b) => b.bookId !== book.bookId),
        },
    );
    this.toasts.show({ title: 'Reward given!' });
  }

  /** Recent activity in plain words; a book's title is left out when it repeats the line above. */
  protected readonly activity = computed(() => {
    const overview = this.overview();
    if (!overview) return [];
    return overview.activity.map((item, i) => {
      const sameBook = i > 0 && overview.activity[i - 1].bookId === item.bookId;
      const ofBook = sameBook ? '' : ` of ${item.bookTitle}`;
      const sticker = FEEDBACK_STICKERS.find((s) => s.value === item.sticker);
      const reader = overview.readerName;
      const lines: Record<ActivityItem['kind'], { emoji: string; text: string }> = {
        'chapter-logged': {
          emoji: '📖',
          text: `${reader} logged Chapter ${item.chapterNumber}${ofBook}`,
        },
        'book-added': {
          emoji: '📚',
          text: `${item.byRole === 'parent' ? 'You' : reader} added ${item.bookTitle}`,
        },
        'sticker-given': {
          emoji: sticker?.emoji ?? '⭐',
          text: `You gave Chapter ${item.chapterNumber}${ofBook} a ${sticker?.name ?? 'sticker'}`,
        },
        'book-finished': { emoji: '🏆', text: `${reader} finished ${item.bookTitle}` },
      };
      return {
        ...lines[item.kind],
        at: item.at,
        key: `${item.kind}-${item.bookId}-${item.chapterNumber}`,
      };
    });
  });

  /** "today", "yesterday", or null for an older day the template formats. */
  protected relativeDay(overview: ReviewOverview, item: QueueItem) {
    if (item.readOn === overview.today) return 'today';
    if (item.readOn === addDays(overview.today, -1)) return 'yesterday';
    return null;
  }
}
