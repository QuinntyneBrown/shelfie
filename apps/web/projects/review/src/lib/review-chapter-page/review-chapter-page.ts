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
import { Banner, Button, Cover, FEEDBACK_STICKERS, StickerPicker, Textarea } from 'components';
import { ApiError, ShellStatusService } from 'core';
import { ChapterLog, FeedbackResult, ReviewApi } from '../review-api';

@Component({
  selector: 'sh-review-chapter-page',
  imports: [Banner, Button, Cover, DatePipe, RouterLink, StickerPicker, Textarea],
  templateUrl: './review-chapter-page.html',
  styleUrl: './review-chapter-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewChapterPage {
  private readonly api = inject(ReviewApi);
  private readonly router = inject(Router);
  private readonly status = inject(ShellStatusService);

  /** Route parameter: the chapter log. */
  readonly id = input.required<string>();
  protected readonly stickers = FEEDBACK_STICKERS;
  protected readonly chapter = signal<ChapterLog | null>(null);
  protected readonly sticker = signal('');
  protected readonly note = signal('');
  protected readonly stickerMissing = signal(false);
  protected readonly sending = signal(false);
  protected readonly sent = signal<FeedbackResult | null>(null);
  protected readonly sentSticker = computed(() =>
    FEEDBACK_STICKERS.find((s) => s.value === this.sticker()),
  );
  protected readonly givenSticker = computed(() =>
    FEEDBACK_STICKERS.find((s) => s.value === this.chapter()?.review?.sticker),
  );

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  private async load(id: string) {
    this.chapter.set(null);
    this.sent.set(null);
    this.sticker.set('');
    this.note.set('');
    this.stickerMissing.set(false);
    try {
      this.chapter.set(await this.api.chapterLog(id));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
    }
  }

  protected async send() {
    const chapter = this.chapter();
    if (!chapter || this.sending()) return;
    this.stickerMissing.set(!this.sticker());
    if (!this.sticker()) return;
    this.sending.set(true);
    try {
      const result = await this.api.sendFeedback(chapter.id, {
        sticker: this.sticker(),
        note: this.note(),
      });
      this.status.queueCount.set(result.queueCount);
      this.sent.set(result);
    } finally {
      this.sending.set(false);
    }
  }
}
