import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Where someone is in a short wizard: a row of dots and "Step N of M". The text carries the meaning; the dots are decoration. */
@Component({
  selector: 'sh-step-indicator',
  templateUrl: './step-indicator.html',
  styleUrl: './step-indicator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepIndicator {
  readonly current = input.required<number>();
  readonly total = input.required<number>();
  protected readonly steps = computed(() => Array.from({ length: this.total() }, (_, i) => i + 1));
}
