import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChapterRow, Cover, EmptyState, FEEDBACK_STICKERS, Progress } from 'components';
import { ApiError, OfflineQueue } from 'core';
import { BookResponse, ChapterSummary, ShelfApi } from '../shelf-api';

/** Books with more chapters than this fold the later ones away. */
const FOLD_ABOVE = 30;
const SHOWN_WHEN_FOLDED = 10;

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'sh-book-page',
  imports: [ChapterRow, Cover, DatePipe, EmptyState, NgTemplateOutlet, Progress, RouterLink],
  templateUrl: './book-page.html',
  styleUrl: './book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookPage {
  private readonly api = inject(ShelfApi);
  private readonly router = inject(Router);
  protected readonly offline = inject(OfflineQueue);

  /** Route parameter. */
  readonly id = input.required<string>();
  protected readonly book = signal<BookResponse | null>(null);
  protected readonly failed = signal(false);
  protected readonly next = computed(
    () => this.book()?.chapters.find((c) => c.state === 'next') ?? null,
  );
  protected readonly folds = computed(() => (this.book()?.chapters.length ?? 0) > FOLD_ABOVE);
  protected readonly shown = computed(() => {
    const chapters = this.book()?.chapters ?? [];
    return this.folds() ? chapters.slice(0, SHOWN_WHEN_FOLDED) : chapters;
  });
  protected readonly folded = computed(() =>
    this.folds() ? (this.book()?.chapters ?? []).slice(SHOWN_WHEN_FOLDED) : [],
  );

  protected readonly foldedLabel = computed(() => {
    const folded = this.folded();
    return folded.length
      ? `Chapters ${folded[0].number} to ${this.book()!.chapterCount} (${folded.length} more)`
      : '';
  });

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  protected async load(id: string) {
    this.book.set(null);
    this.failed.set(false);
    try {
      this.book.set(await this.api.book(id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 0 && !this.offline.online()) {
        await this.router.navigate(['/offline'], { queryParams: { from: `/book/${id}` } });
      } else if (e instanceof ApiError && e.status === 404) {
        await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set(true);
      }
    }
  }

  protected stickerEmoji(value: string) {
    return FEEDBACK_STICKERS.find((s) => s.value === value)?.emoji ?? '⭐';
  }

  protected whenRead(book: BookResponse, chapter: ChapterSummary) {
    const readOn = chapter.log!.readOn;
    if (readOn === book.today) return 'Today';
    if (readOn === addDays(book.today, -1)) return 'Yesterday';
    return null;
  }
}
