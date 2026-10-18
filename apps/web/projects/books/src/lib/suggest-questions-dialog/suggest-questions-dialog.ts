import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { Banner, Dialog, EmptyState, Skeleton, Suggestion } from 'components';
import { ApiError, ToastService } from 'core';
import { BooksApi, CustomQuestion } from '../books-api';

interface Row {
  text: string;
  chosen: boolean;
  error: string | null;
}

type State = 'busy' | 'ready' | 'empty' | 'failed' | 'unavailable';

const TOO_SHORT_OR_LONG =
  'Finish the question — at least a few words, ending in a question mark helps.';

/**
 * Asks for suggested questions each time it opens; the parent ticks and rewords the ones to keep, and each is added
 * through the same route as a question typed by hand. Nothing reaches the reader until it is added.
 */
@Component({
  selector: 'sh-suggest-questions-dialog',
  imports: [Banner, Dialog, EmptyState, Skeleton, Suggestion],
  templateUrl: './suggest-questions-dialog.html',
  styleUrl: './suggest-questions-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestQuestionsDialog {
  private readonly api = inject(BooksApi);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);

  readonly open = input(false);
  readonly bookId = input.required<string>();
  readonly bookTitle = input.required<string>();
  readonly readerName = input.required<string>();
  /** Each question as soon as it is saved. */
  readonly added = output<CustomQuestion>();
  readonly closed = output<void>();

  protected readonly state = signal<State>('busy');
  protected readonly rateLimited = signal(false);
  protected readonly chapter = signal(1);
  protected readonly rows = signal<Row[]>([]);
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);
  protected readonly chosenCount = computed(() => this.rows().filter((r) => r.chosen).length);
  private readonly suggestions = viewChildren(Suggestion);
  /** Only the latest ask may fill the list. */
  private asks = 0;

  constructor() {
    effect(() => {
      if (this.open()) untracked(() => this.ask());
    });
  }

  protected async ask() {
    const ask = ++this.asks;
    this.state.set('busy');
    this.rows.set([]);
    this.saveFailed.set(false);
    try {
      const { chapter, suggestions } = await this.api.suggestQuestions(this.bookId());
      if (ask !== this.asks) return;
      this.chapter.set(chapter);
      this.rows.set(suggestions.map((text) => ({ text, chosen: false, error: null })));
      this.state.set(suggestions.length ? 'ready' : 'empty');
    } catch (e) {
      if (ask !== this.asks) return;
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 503) return this.state.set('unavailable');
      if (status > 0 && status < 500 && status !== 429) throw e;
      this.rateLimited.set(status === 429);
      this.state.set('failed');
    }
  }

  protected update(index: number, change: Partial<Row>) {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  protected async add() {
    if (this.saving() || !this.chosenCount()) return;
    this.rows.update((rows) =>
      rows.map((row) => {
        const length = row.text.trim().length;
        return {
          ...row,
          error: row.chosen && (length < 5 || length > 200) ? TOO_SHORT_OR_LONG : null,
        };
      }),
    );
    const invalid = this.rows().findIndex((row) => row.error);
    if (invalid >= 0) {
      afterNextRender(() => this.suggestions()[invalid]?.focus(), { injector: this.injector });
      return;
    }

    const chosen = this.rows().filter((row) => row.chosen);
    this.saving.set(true);
    this.saveFailed.set(false);
    try {
      for (const row of chosen) {
        this.added.emit(await this.api.addQuestion(this.bookId(), row.text.trim()));
        this.rows.update((rows) => rows.filter((r) => r !== row));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.saveFailed.set(true);
      return;
    } finally {
      this.saving.set(false);
    }
    const one = chosen.length === 1;
    this.toasts.show({
      title: one ? '1 question added' : `${chosen.length} questions added`,
      text: `${this.readerName()} answers ${one ? 'it' : 'them'} from chapter ${this.chapter()}.`,
    });
    this.closed.emit();
  }
}
