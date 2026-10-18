import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Banner, Cover, Dialog, TextField, Textarea } from 'components';
import { ApiError } from 'core';
import { FinishedBook, ReviewApi } from '../review-api';

const QUICK_PICKS = [
  'Ice cream Saturday',
  'Movie night',
  'Stay up 30 min later',
  'Trip to the bookshop',
];

/** Gives a finished book its reward. */
@Component({
  selector: 'sh-give-reward-dialog',
  imports: [Banner, Cover, DatePipe, Dialog, TextField, Textarea],
  templateUrl: './give-reward-dialog.html',
  styleUrl: './give-reward-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiveRewardDialog {
  private readonly api = inject(ReviewApi);

  /** The book to reward, or null when the dialog is closed. */
  readonly book = input<FinishedBook | null>(null);
  readonly readerName = input.required<string>();
  readonly given = output<FinishedBook>();
  readonly closed = output<void>();

  protected readonly quickPicks = QUICK_PICKS;
  protected readonly text = signal('');
  protected readonly note = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (!this.book()) return;
      this.text.set('');
      this.note.set('');
      this.error.set(null);
      this.failed.set(false);
    });
  }

  protected async give() {
    const book = this.book();
    if (!book || this.busy()) return;
    const text = this.text().trim();
    this.error.set(
      !text
        ? `Tell ${this.readerName()} what the reward is.`
        : text.length > 100
          ? 'Keep it to 100 characters.'
          : null,
    );
    if (this.error()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await this.api.giveReward(book.bookId, { text, note: this.note().trim() });
      this.given.emit(book);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
