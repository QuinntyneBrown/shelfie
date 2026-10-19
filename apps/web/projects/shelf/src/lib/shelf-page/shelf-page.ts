import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AchievementBadge,
  Banner,
  BookCard,
  Celebration,
  Cover,
  EmptyState,
  FEEDBACK_STICKERS,
  Progress,
  Leaderboard,
  RewardCard,
  Skeleton,
  StreakRewardBadge,
  StreakRewardCard,
  WeekStrip,
} from 'components';
import { ApiError, SessionService, ShellStatusService, ToastService } from 'core';
import { PushOffer } from '../push-offer/push-offer';
import { Challenges, GalleryReward, GalleryView, ShelfApi, ShelfResponse, UnseenFeedback } from '../shelf-api';

@Component({
  selector: 'sh-shelf-page',
  imports: [
    AchievementBadge,
    Banner,
    BookCard,
    Celebration,
    Cover,
    DatePipe,
    EmptyState,
    Leaderboard,
    NgTemplateOutlet,
    Progress,
    PushOffer,
    RewardCard,
    RouterLink,
    Skeleton,
    StreakRewardBadge,
    StreakRewardCard,
    WeekStrip,
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

  /** The household's challenges, loaded beside the shelf; a failure only hides the card. */
  private readonly challenges = signal<Challenges | null>(null);
  /** The challenge she takes part in, while it runs and for 7 days after it ends (L2-144). */
  protected readonly challenge = computed(() => {
    const challenges = this.challenges();
    const challenge = challenges?.current;
    const me = this.session.current()?.profileId;
    if (!challenge || !challenge.standings.some((s) => s.readerId === me)) return null;
    const endedDaysAgo = (Date.parse(challenges!.today) - Date.parse(challenge.endsOn)) / 86_400_000;
    return challenge.ended && endedDaysAgo > 7 ? null : challenge;
  });
  protected readonly won = computed(() => {
    const challenge = this.challenge();
    return !!challenge?.ended && challenge.winners.includes(this.session.current()?.profileId ?? '');
  });
  /** One encouraging line for her place on the board, or the result once it has ended. */
  protected readonly challengeLine = computed(() => {
    const challenge = this.challenge();
    const me = challenge?.standings.find((s) => s.readerId === this.session.current()?.profileId);
    if (!challenge || !me) return '';
    const unit = (n: number) => `${n} ${challenge.measure === 'chapters' ? 'chapter' : 'book'}${n === 1 ? '' : 's'}`;
    if (challenge.ended) {
      if (this.won()) return challenge.reward ? `Your reward: ${challenge.reward.text}` : 'Your reward is on its way.';
      const winners = challenge.standings.filter((s) => challenge.winners.includes(s.readerId)).map((s) => s.name);
      return `${winners.length ? `${winners.join(' and ')} won this one.` : 'No winner this time.'} You read ${unit(me.count)}, well done!`;
    }
    if (challenge.standings.length === 1) {
      const left = challenge.goal - me.count;
      return left > 0 ? `${left} more to reach the goal.` : 'You reached the goal!';
    }
    const others = challenge.standings.filter((s) => s !== me);
    if (me.leading) {
      const level = others.filter((s) => s.leading).map((s) => s.name);
      return level.length ? `You’re level with ${level.join(' and ')}. One more puts you ahead!` : 'You’re in the lead. Keep going!';
    }
    const above = others.filter((s) => s.count > me.count).at(-1);
    return above ? `${above.count - me.count} to catch ${above.name}. You can do it!` : 'Be the first to score!';
  });

  constructor() {
    this.load();
    this.loadGallery();
    this.api.challenges().then(
      (challenges) => this.challenges.set(challenges),
      () => this.challenges.set(null),
    );
  }

  protected measureLabel(measure: string) {
    return measure === 'chapters' ? 'Chapters logged' : 'Books finished';
  }

  protected daysLeftLabel(daysLeft: number) {
    return daysLeft === 0 ? 'last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
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
