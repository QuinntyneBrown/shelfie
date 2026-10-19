import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AchievementBadge,
  Banner,
  BookCard,
  Celebration,
  EmptyState,
  FEEDBACK_STICKERS,
  RewardCard,
  Skeleton,
  StreakRewardBadge,
  StreakRewardCard,
} from 'components';
import { ApiError, SessionService, ShellStatusService, ToastService } from 'core';
import { GalleryReward, GalleryView, ShelfApi, ShelfResponse, UnseenFeedback } from '../shelf-api';

@Component({
  selector: 'sh-shelf-page',
  imports: [
    AchievementBadge,
    Banner,
    BookCard,
    Celebration,
    DatePipe,
    EmptyState,
    RewardCard,
    RouterLink,
    Skeleton,
    StreakRewardBadge,
    StreakRewardCard,
  ],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfPage {
  /** The streak rewards a parent has set, each with how far along it is (L2-102). */
  protected readonly streakCards = computed(() => {
    const data = this.shelf();
    if (!data) return [];
    const set = data.streakRewards.filter((r) => r.name);
    const next = set.find((r) => !r.earnedOn);
    return set.map((reward) => ({
      reward,
      progress: reward.givenOn
        ? null
        : reward.earnedOn
          ? reward.milestone
          : reward === next
            ? Math.min(data.streak, reward.milestone)
            : null,
    }));
  });
  protected readonly earnedStreakReward = computed(() =>
    this.shelf()?.streakRewards.find((r) => r.name && r.earnedOn && !r.givenOn),
  );
  protected earnedBadges = (shelf: ShelfResponse) => shelf.badges.filter((badge) => badge.earned).length;
  protected readonly session = inject(SessionService);
  protected readonly shelf = signal<ShelfResponse | null>(null);
  protected readonly failed = signal(false);
  /** Banners dismissed on this visit; they return until the chapter is opened. */
  protected readonly dismissed = signal<string[]>([]);
  protected readonly feedback = computed(() =>
    (this.shelf()?.unseenFeedback ?? [])
      .filter((f) => !this.dismissed().includes(f.chapterLogId))
      .map((f) => ({ ...f, given: FEEDBACK_STICKERS.find((s) => s.value === f.sticker) })),
  );
  private readonly api = inject(ShelfApi);
  private readonly status = inject(ShellStatusService);
  private readonly toasts = inject(ToastService);

  /** The reward gallery, loaded beside the shelf so a failure leaves the shelf usable. */
  protected readonly gallery = signal<GalleryView | null>(null);
  protected readonly galleryFailed = signal(false);
  protected readonly goalReached = computed(() => this.gallery()?.goal?.reached ?? false);

  protected readonly isEmpty = computed(() => {
    const shelf = this.shelf();
    return (
      shelf !== null && !shelf.reading.length && !shelf.upNext.length && !shelf.finished.length
    );
  });

  constructor() {
    this.load();
    this.loadGallery();
  }

  protected async loadGallery() {
    this.galleryFailed.set(false);
    try {
      this.gallery.set(await this.api.gallery());
    } catch {
      this.galleryFailed.set(true);
    }
  }

  protected async pick(reward: GalleryReward) {
    try {
      this.gallery.set(await this.api.pickGoal(reward.id));
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({
        severity: 'danger',
        title: 'Your goal wasn’t picked',
        text: 'Check your connection and try again.',
      });
    }
  }

  /** Books finished toward a reward, when it is her goal; null otherwise. */
  protected progressOf(reward: GalleryReward) {
    const goal = this.gallery()?.goal;
    return goal?.rewardId === reward.id ? goal.finished : null;
  }

  protected noteOf(reward: GalleryReward) {
    const books = (n: number) => `${n} ${n === 1 ? 'book' : 'books'}`;
    const finished = this.progressOf(reward);
    if (finished === null) return `Finish ${books(reward.target)}`;
    const left = reward.target - finished;
    return `${finished} of ${books(reward.target)} finished · ${left > 0 ? `${left} more to go!` : 'you did it!'}`;
  }

  protected async load() {
    this.failed.set(false);
    try {
      const shelf = await this.api.shelf();
      this.shelf.set(shelf);
      this.status.streak.set(shelf.streak);
    } catch {
      this.failed.set(true);
    }
  }
}
