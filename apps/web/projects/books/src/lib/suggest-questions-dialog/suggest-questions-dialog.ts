import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Dialog, Suggestion } from 'components';
import { BooksApi, CustomQuestion } from '../books-api';

interface Row {
  text: string;
  chosen: boolean;
}

/**
 * Asks for suggested questions each time it opens; the parent ticks and rewords the ones to keep, and each is added
 * through the same route as a question typed by hand. Nothing reaches the reader until it is added.
 */
@Component({
  selector: 'sh-suggest-questions-dialog',
  imports: [Dialog, Suggestion],
  templateUrl: './suggest-questions-dialog.html',
  styleUrl: './suggest-questions-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestQuestionsDialog {
  private readonly api = inject(BooksApi);

  readonly open = input(false);
  readonly bookId = input.required<string>();
  readonly bookTitle = input.required<string>();
  readonly readerName = input.required<string>();
  /** Each question as soon as it is saved. */
  readonly added = output<CustomQuestion>();
  readonly closed = output<void>();

  protected readonly chapter = signal(1);
  protected readonly rows = signal<Row[]>([]);
  protected readonly chosenCount = computed(() => this.rows().filter((r) => r.chosen).length);

  constructor() {
    effect(() => {
      if (this.open()) untracked(() => this.ask());
    });
  }

  protected async ask() {
    this.rows.set([]);
    const { chapter, suggestions } = await this.api.suggestQuestions(this.bookId());
    this.chapter.set(chapter);
    this.rows.set(suggestions.map((text) => ({ text, chosen: false })));
  }

  protected update(index: number, change: Partial<Row>) {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }
}
