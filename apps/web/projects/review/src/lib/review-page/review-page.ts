import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover, EmptyState } from 'components';
import { ShellStatusService } from 'core';
import { QueueItem, ReviewApi, ReviewOverview } from '../review-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** From this many waiting chapters the summary gently notices the pile. */
const LONG_QUEUE = 10;

@Component({
  selector: 'sh-review-page',
  imports: [Cover, DatePipe, EmptyState, RouterLink],
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

  /** "today", "yesterday", or null for an older day the template formats. */
  protected relativeDay(overview: ReviewOverview, item: QueueItem) {
    if (item.readOn === overview.today) return 'today';
    if (item.readOn === addDays(overview.today, -1)) return 'yesterday';
    return null;
  }
}
