import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EmptyState, Leaderboard, Skeleton } from 'components';
import { ApiError } from 'core';
import { Challenge, Challenges, ReviewApi } from '../review-api';

/** Review's Challenges tab: the newest challenge with its leaderboard (review/run-challenges). */
@Component({
  selector: 'sh-challenges-tab',
  imports: [DatePipe, EmptyState, Leaderboard, Skeleton],
  templateUrl: './challenges-tab.html',
  styleUrl: './challenges-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengesTab {
  private readonly api = inject(ReviewApi);
  protected readonly view = signal<Challenges | null>(null);
  protected readonly failed = signal(false);

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

  protected measureLabel(challenge: Challenge) {
    return challenge.measure === 'chapters' ? 'Chapters logged' : 'Books finished';
  }

  protected daysLeftLabel(challenge: Challenge) {
    if (challenge.daysLeft === 0) return 'last day';
    return `${challenge.daysLeft} ${challenge.daysLeft === 1 ? 'day' : 'days'} left`;
  }
}
