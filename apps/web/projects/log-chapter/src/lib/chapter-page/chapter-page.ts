import { DatePipe } from '@angular/common';
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
import { Cover, FEEDBACK_STICKERS } from 'components';
import { ApiError } from 'core';
import { ChapterView, ChaptersApi } from '../chapters-api';

@Component({
  selector: 'sh-chapter-page',
  imports: [Cover, DatePipe, RouterLink],
  templateUrl: './chapter-page.html',
  styleUrl: './chapter-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterPage {
  private readonly api = inject(ChaptersApi);
  private readonly router = inject(Router);

  /** Route parameter: the chapter log. */
  readonly id = input.required<string>();
  protected readonly chapter = signal<ChapterView | null>(null);
  protected readonly given = computed(() =>
    FEEDBACK_STICKERS.find((s) => s.value === this.chapter()?.review?.sticker),
  );

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  private async load(id: string) {
    this.chapter.set(null);
    try {
      const chapter = await this.api.chapter(id);
      this.chapter.set(chapter);
      if (chapter.review && !chapter.review.feedbackSeenAt) {
        this.api
          .markSeen(chapter.id)
          .catch((e) => console.error('Could not mark feedback seen', e));
      }
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
    }
  }
}
