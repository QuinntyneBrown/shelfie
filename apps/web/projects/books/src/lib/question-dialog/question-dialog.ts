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

  constructor() {
    effect(() => {
      if (this.open()) this.text.set(this.editing() ?? '');
    });
  }

  protected save() {
    if (this.busy()) return;
    this.saved.emit(this.text().trim());
  }
}
