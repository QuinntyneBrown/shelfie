import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EmptyState, Leaderboard, Skeleton } from 'components';
import { ApiError, ToastService } from 'core';
import { Challenge, Challenges, ReviewApi } from '../review-api';
import { StartChallengeDialog } from '../start-challenge-dialog/start-challenge-dialog';

/** Review's Challenges tab: the newest challenge with its leaderboard (review/run-challenges). */
@Component({
  selector: 'sh-challenges-tab',
  imports: [DatePipe, EmptyState, Leaderboard, Skeleton, StartChallengeDialog],
  templateUrl: './challenges-tab.html',
  styleUrl: './challenges-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengesTab {
  private readonly api = inject(ReviewApi);
  protected readonly view = signal<Challenges | null>(null);
  protected readonly failed = signal(false);
  protected readonly starting = signal(false);
  private readonly toasts = inject(ToastService);

  constructor() {
    void this.load();
  }

  protected async load() {
    this.failed.set(false);
    try {
      this.view.set(await this.api.challenges());
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    }
  }

  /** A challenge can start only when none is running (L2-138). */
  protected canStart(view: Challenges) {
    return !view.current || view.current.ended;
  }

  protected started() {
    this.starting.set(false);
    this.toasts.show({ title: 'Challenge started' });
    void this.load();
  }

  protected alreadyRunning() {
    this.starting.set(false);
    this.toasts.show({ severity: 'warning', title: 'A challenge is already running' });
    void this.load();
  }

  protected measureLabel(challenge: Challenge) {
    return challenge.measure === 'chapters' ? 'Chapters logged' : 'Books finished';
  }

  protected daysLeftLabel(challenge: Challenge) {
    if (challenge.daysLeft === 0) return 'last day';
    return `${challenge.daysLeft} ${challenge.daysLeft === 1 ? 'day' : 'days'} left`;
  }
}
