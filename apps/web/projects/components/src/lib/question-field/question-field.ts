import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, model } from '@angular/core';

/** The counter appears once this many characters or fewer are left. */
const COUNTER_FROM = 200;

@Component({
  selector: 'sh-question-field',
  templateUrl: './question-field.html',
  styleUrl: './question-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly number = input.required<number>();
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
  readonly maxlength = input(2000);
  readonly value = model('');

  protected readonly inputId = computed(() => `q${this.number()}`);
  protected readonly charactersLeft = computed(() => this.maxlength() - this.value().length);
  protected readonly showCounter = computed(() => this.charactersLeft() <= COUNTER_FROM);

  focus() {
    this.host.nativeElement.querySelector('textarea')?.focus();
  }

  protected edit(event: Event) {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
