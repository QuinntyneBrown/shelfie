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
import { Avatar, Banner, Button, Cover, FEEDBACK_STICKERS, StickerPicker, Textarea } from 'components';
import { ApiError, ShellStatusService } from 'core';
import { Advice, ChapterLog, FeedbackResult, ReviewApi } from '../review-api';

@Component({
  selector: 'sh-review-chapter-page',
  imports: [Avatar, Banner, Button, Cover, DatePipe, RouterLink, StickerPicker, Textarea],
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
  protected readonly assist = signal<'idle' | 'busy' | 'done' | 'failed' | 'unavailable'>('idle');
  protected readonly advice = signal<Advice | null>(null);
  protected readonly weakCount = computed(
    () => this.advice()?.answers.filter((a) => a.verdict === 'weak').length ?? 0,
  );
  /** "Use draft" never replaces words the parent has typed. */
  protected readonly noteHasWords = computed(() => this.note().trim() !== '');
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
    this.assist.set('idle');
    this.advice.set(null);
    try {
      this.chapter.set(await this.api.chapterLog(id));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
    }
  }

  /** The assistant's reason when it flagged this answer as weak. */
  protected flagFor(position: number) {
    return (
      this.advice()?.answers.find((a) => a.position === position && a.verdict === 'weak')?.reason ??
      null
    );
  }

  protected async askForHelp() {
    const chapter = this.chapter();
    if (!chapter || this.assist() === 'busy') return;
    this.assist.set('busy');
    let advice: Advice | null = null;
    let outcome: 'done' | 'failed' | 'unavailable' = 'done';
    try {
      advice = await this.api.assist(chapter.id);
    } catch (e) {
      // Whatever went wrong, the review itself keeps working (L2-067).
      outcome =
        e instanceof ApiError && e.type === 'assistant-unavailable' ? 'unavailable' : 'failed';
    }
    // Advice for a chapter the parent has already moved on from is dropped.
    if (this.chapter() !== chapter) return;
    this.advice.set(advice);
    this.assist.set(outcome);
  }

  protected useDraft() {
    const draft = this.advice()?.draft;
    if (draft && !this.noteHasWords()) this.note.set(draft);
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
