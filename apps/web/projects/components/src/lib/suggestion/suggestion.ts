import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
} from '@angular/core';

let nextId = 0;

/** A suggested question: a tick to keep it and its wording, editable in place. Use inside a `role="list"`. */
@Component({
  selector: 'sh-suggestion',
  templateUrl: './suggestion.html',
  styleUrl: './suggestion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'suggestion', role: 'listitem' },
})
export class Suggestion {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly number = input.required<number>();
  readonly error = input<string | null>(null);
  readonly disabled = input(false);
  readonly chosen = model(false);
  readonly text = model('');

  protected readonly id = `sh-suggestion-${nextId++}`;
  protected readonly errorId = computed(() => (this.error() ? this.id + '-error' : null));

  focus() {
    this.host.nativeElement.querySelector('textarea')?.focus();
  }

  protected tick(event: Event) {
    this.chosen.set((event.target as HTMLInputElement).checked);
  }

  protected edit(event: Event) {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }
}
