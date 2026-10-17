import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'sh-question-field',
  templateUrl: './question-field.html',
  styleUrl: './question-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionField {
  readonly number = input.required<number>();
  readonly label = input.required<string>();
  readonly value = model('');
  protected readonly inputId = computed(() => `q${this.number()}`);

  protected edit(event: Event) {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
