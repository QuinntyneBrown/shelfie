import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AchievementBadge, ActivityItem as ActivityLine, Cover, EmptyState, FEEDBACK_STICKERS, Segmented } from 'components';
import { ApiError, ReaderChoiceService, ShellStatusService, ToastService } from 'core';
import { GiveRewardDialog } from '../give-reward-dialog/give-reward-dialog';
import { ActivityItem, FinishedBook, QueueItem, ReviewApi, ReviewOverview, StreakReward, waitingInHousehold } from '../review-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** From this many waiting chapters the summary gently notices the pile. */
const LONG_QUEUE = 10;

@Component({
  selector: 'sh-review-page',
  imports: [AchievementBadge, ActivityLine, Cover, DatePipe, EmptyState, GiveRewardDialog, RouterLink, Segmented],
  templateUrl: './review-page.html',
  styleUrl: './review-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  protected earnedBadges = (overview: ReviewOverview) => overview.badges.filter((badge) => badge.earned).length;
  private readonly toasts = inject(ToastService);
  protected readonly overview = signal<ReviewOverview | null>(null);
  protected readonly rewarding = signal<FinishedBook | null>(null);
  private readonly reviewApi = inject(ReviewApi);
  /** The streak milestone being given, so its button cannot be pressed twice. */
  protected readonly givingStreak = signal<number | null>(null);
  /** Streak rewards the reader has earned and the parent has not given yet. */
  protected readonly earnedStreakRewards = computed(() =>
    (this.overview()?.streakRewards ?? []).filter((r) => r.name && r.earnedOn && !r.givenOn),
  );
  protected readonly summary = computed(() => {
    const overview = this.overview();
    if (!overview) return '';
    const chapters = overview.queue.length;
    const rewards = overview.finishedUnrewarded.length + this.earnedStreakRewards().length;
    const line = `${chapters} ${chapters === 1 ? 'chapter' : 'chapters'} to read · ${rewards} ${rewards === 1 ? 'reward' : 'rewards'} to give`;
    return chapters >= LONG_QUEUE ? `${line} · back from a week away?` : line;
  });

  protected readonly failed = signal(false);
  private readonly status = inject(ShellStatusService);

  private readonly status = inject(ShellStatusService);
  private readonly readerChoice = inject(ReaderChoiceService);
  /** The picker's chips, one per reader with her waiting chapters; none with a single reader (L2-138). */
  protected readonly readerOptions = computed(() => {
    const readers = this.overview()?.readers ?? [];
    return readers.length > 1 ? readers.map((r) => ({ value: r.id, label: `${r.name} · ${r.waiting}` })) : [];
  });

  constructor() {
    this.load();
  }

  protected async load() {
    this.failed.set(false);
    let overview: ReviewOverview;
    try {
      overview = await this.reviewApi.load(this.readerChoice.query()).catch((e) => {
        // A remembered reader who is no longer in the household: forget her and show the first reader.
        if (!(e instanceof ApiError && e.status === 404 && this.readerChoice.selected())) throw e;
        this.readerChoice.choose(null);
        return this.reviewApi.load();
      });
    } catch {
      this.failed.set(true);
      return;
    }
    this.overview.set(overview);
    this.status.queueCount.set(waitingInHousehold(overview));
  }

  protected pickReader(readerId: string) {
    if (readerId === this.overview()?.readerId) return;
    this.readerChoice.choose(readerId);
    this.load();
  }

  /** The goal's name when this finished book is the one that reached the reader's goal. */
  protected goalNameOf(overview: ReviewOverview, book: FinishedBook | null) {
    const goal = overview.goal;
    return goal?.reached && goal.bookId === book?.bookId ? goal.name : null;
  }

  protected async giveStreakReward(reward: StreakReward) {
    if (this.givingStreak() !== null) return;
    this.givingStreak.set(reward.milestone);
    try {
      const given = await this.reviewApi.giveStreakReward(reward.milestone, this.overview()?.readerId ?? null);
      this.overview.update(
        (o) => o && { ...o, streakRewards: o.streakRewards.map((r) => (r.milestone === given.milestone ? given : r)) },
      );
      this.toasts.show({ title: `${reward.name} given` });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({ title: 'The reward wasn’t given', severity: 'danger' });
    } finally {
      this.givingStreak.set(null);
    }
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
