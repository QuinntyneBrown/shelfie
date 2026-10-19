import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AchievementBadge,
  Avatar,
  Banner,
  BookCard,
  Celebration,
  Cover,
  EmptyState,
  FEEDBACK_STICKERS,
  Progress,
  RewardCard,
  Skeleton,
  StreakRewardBadge,
  StreakRewardCard,
  WeekStrip,
} from 'components';
import { ApiError, SessionService, ShellStatusService, ToastService } from 'core';
import { PushOffer } from '../push-offer/push-offer';
import {
  GalleryReward,
  GalleryView,
  ShelfApi,
  ShelfResponse,
  TogetherSession,
  TogetherView,
  UnseenFeedback,
} from '../shelf-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'sh-shelf-page',
  imports: [
    AchievementBadge,
    Avatar,
    Banner,
    BookCard,
    Celebration,
    Cover,
    DatePipe,
    EmptyState,
    Progress,
    PushOffer,
    Progress,
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

  /** Reading together, loaded beside the shelf; with no other reader in the household it shows nothing (L2-145). */
  protected readonly together = signal<TogetherView | null>(null);
  protected readonly readsTogether = computed(() => !!this.together()?.partners.length);
  /** Each session told from her side: the other reader's avatar, what happened and when (L2-140). */
  protected readonly togetherRows = computed(() => {
    const view = this.together();
    const me = this.session.current()?.profileId;
    if (!view) return [];
    return view.sessions.map((s) => {
      const mine = s.helper.id === me;
      const partner = mine ? s.other : s.helper;
      const what = mine
        ? s.action === 'helped' ? `You helped ${partner.name} read` : `You read to ${partner.name}`
        : s.action === 'helped' ? `${partner.name} helped you read` : `${partner.name} read to you`;
      const confirmable = !s.confirmed && s.loggedById !== me;
      return { session: s, partner, confirmable, text: `${what} · ${s.minutes} minutes`, note: this.sessionNoteOf(s, partner.name, view.today) };
    });
  });

  /** Her helper reward this round: minutes while she has some, reached once she earned it (L2-140). */
  protected readonly helper = computed(() => {
    const reward = this.together()?.helperReward;
    const me = this.session.current()?.profileId;
    if (!reward || !me) return null;
    const minutes = reward.minutes[me] ?? 0;
    const reached = reward.earnedBy?.id === me;
    if (!minutes && !reached) return null;
    const shown = reached ? Math.max(minutes, reward.targetMinutes) : minutes;
    return {
      reward,
      reached,
      minutes: shown,
      toGo: Math.max(reward.targetMinutes - minutes, 0),
      label: `${this.session.current()?.name} has helped for ${Math.min(shown, reward.targetMinutes)} of ${reward.targetMinutes} minutes`,
    };
  });

  constructor() {
    this.load();
    this.loadGallery();
    this.loadTogether();
  }

  protected async loadTogether() {
    try {
      this.together.set(await this.api.together());
    } catch {
      this.together.set(null);
    }
  }

  protected async confirm(session: TogetherSession) {
    try {
      await this.api.confirmSession(session.id);
      this.together.update(
        (view) => view && { ...view, sessions: view.sessions.map((s) => (s.id === session.id ? { ...s, confirmed: true } : s)) },
      );
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({ severity: 'danger', title: 'That wasn’t saved', text: 'Check your connection and try again.' });
    }
  }

  private sessionNoteOf(session: TogetherSession, partnerName: string, today: string) {
    const day =
      session.readOn === today
        ? 'Today'
        : session.readOn === addDays(today, -1)
          ? 'Yesterday'
          : new Date(`${session.readOn}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '');
    const loggedByMe = session.loggedById === this.session.current()?.profileId;
    if (session.confirmed) return `${day} · ${loggedByMe ? partnerName + ' says that’s right' : 'you said that’s right'}`;
    return loggedByMe ? day : `${day} · ${partnerName} logged it`;
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
