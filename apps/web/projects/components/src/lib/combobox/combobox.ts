import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { Cover } from '../cover/cover';

/** One row of the dropped list: what the owner looked up, ready to show. */
export interface ComboboxOption {
  id: string;
  title: string;
  detail: string;
  /** A cover URL, or null for the placeholder. */
  image: string | null;
  /** A guess from the AI helper, shown with the "Suggested" badge. */
  suggested: boolean;
}

export type ComboboxStatus = 'idle' | 'searching' | 'empty' | 'failed';

const MAX_SHOWN = 5;
const NOTES: Record<Exclude<ComboboxStatus, 'idle'>, string> = {
  searching: 'Looking that up…',
  empty: 'No matches. Keep typing, or fill the rest in yourself.',
  failed: 'Shelfie couldn’t look that up. You can still fill it in yourself.',
};

let nextId = 0;

/**
 * A text field whose matches drop down as a list (the WAI-ARIA combobox pattern with list autocomplete
 * and manual selection). The owner looks things up and passes the rows and the status; this renders them,
 * moves through them with the keyboard, keeps focus in the input and reports a pick.
 */
@Component({
  selector: 'sh-combobox',
  imports: [Cover],
  templateUrl: './combobox.html',
  styleUrl: './combobox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Combobox {
  readonly label = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');
  readonly maxlength = input<number | null>(null);
  readonly error = input<string | null>(null);
  readonly readonly = input(false);
  readonly autofocus = input(false);
  readonly options = input<ComboboxOption[]>([]);
  readonly status = input<ComboboxStatus>('idle');
  /** A line above the rows, such as the one that calls suggested rows guesses. */
  readonly note = input<string | null>(null);
  readonly value = model('');
  readonly picked = output<ComboboxOption>();

  protected readonly id = `sh-combobox-${nextId++}`;
  protected readonly listId = `${this.id}-list`;
  protected readonly shown = computed(() => this.options().slice(0, MAX_SHOWN));
  /** Set by Escape, Tab, a pick or focus leaving; new rows open the list again. */
  private readonly dismissed = linkedSignal({ source: this.options, computation: () => false });
  protected readonly active = linkedSignal({ source: this.options, computation: () => 0 });
  protected readonly open = computed(() => this.shown().length > 0 && !this.dismissed());
  protected readonly activeId = computed(() => (this.open() ? this.optionId(this.active()) : null));
  protected readonly noteText = computed(() =>
    this.shown().length || this.status() === 'idle'
      ? null
      : NOTES[this.status() as keyof typeof NOTES],
  );
  /** What a screen reader hears: the count when the list opens, the fill after a pick. */
  protected readonly announcement = signal('');

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const rows = this.shown();
      const kind = rows.some((row) => row.suggested) ? 'suggestions' : 'matches';
      this.announcement.set(
        `${rows.length} ${kind}. Use the up and down arrows to pick one, or keep typing.`,
      );
    });
  }

  protected optionId(index: number) {
    return `${this.id}-opt-${index}`;
  }

  protected edit(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
    this.dismissed.set(false);
  }

  protected keydown(event: KeyboardEvent) {
    const count = this.shown().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!count) return;
      event.preventDefault();
      if (!this.open()) {
        this.dismissed.set(false);
        this.active.set(0);
      } else {
        const step = event.key === 'ArrowDown' ? 1 : count - 1;
        this.active.set((this.active() + step) % count);
      }
    } else if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      this.pick(this.shown()[this.active()]);
    } else if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.dismissed.set(true);
    } else if (event.key === 'Tab') {
      this.dismissed.set(true);
    }
  }

  protected leave() {
    this.dismissed.set(true);
  }

  protected pick(option: ComboboxOption) {
    this.dismissed.set(true);
    this.announcement.set('Filled in from the match. Check the chapters.');
    this.picked.emit(option);
  }
}
