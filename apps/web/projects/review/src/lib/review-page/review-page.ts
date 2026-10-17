import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover } from 'components';
import { QueueItem, ReviewApi, ReviewOverview } from '../review-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'sh-review-page',
  imports: [Cover, DatePipe, RouterLink],
  templateUrl: './review-page.html',
  styleUrl: './review-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  protected readonly overview = signal<ReviewOverview | null>(null);
  protected readonly summary = computed(() => {
    const overview = this.overview();
    if (!overview) return '';
    const chapters = overview.queue.length;
    const rewards = overview.finishedUnrewarded.length;
    return `${chapters} ${chapters === 1 ? 'chapter' : 'chapters'} to read · ${rewards} ${rewards === 1 ? 'reward' : 'rewards'} to give`;
  });

  constructor() {
    inject(ReviewApi)
      .load()
      .then((overview) => this.overview.set(overview));
  }

  /** "today", "yesterday", or null for an older day the template formats. */
  protected relativeDay(overview: ReviewOverview, item: QueueItem) {
    if (item.readOn === overview.today) return 'today';
    if (item.readOn === addDays(overview.today, -1)) return 'yesterday';
    return null;
  }
}
