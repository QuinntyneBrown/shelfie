import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { Banner, Dialog, Textarea } from 'components';

/** Adds a question to a book, or edits one; the owner does the saving and reports back. */
@Component({
  selector: 'sh-question-dialog',
  imports: [Banner, Dialog, Textarea],
  templateUrl: './question-dialog.html',
  styleUrl: './question-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionDialog {
  readonly open = input(false);
  /** The question being edited, or null to add one. */
  readonly editing = input<string | null>(null);
  readonly readerName = input.required<string>();
  readonly bookTitle = input.required<string>();
  readonly busy = input(false);
  readonly failed = input(false);
  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly text = signal('');
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.text.set(this.editing() ?? '');
      this.error.set(null);
    });
  }

  protected save() {
    if (this.busy()) return;
    const text = this.text().trim();
    const fits = text.length >= 5 && text.length <= 200;
    this.error.set(
      fits ? null : 'Finish the question — at least a few words, ending in a question mark helps.',
    );
    if (fits) this.saved.emit(text);
  }
}
