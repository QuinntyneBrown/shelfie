import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'sh-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  readonly value = input.required<number>();
  readonly max = input.required<number>();
  readonly label = input.required<string>();
  /** The taller bar, for a single goal shown on its own. */
  readonly large = input(false);
  protected readonly percent = computed(() =>
    this.max() > 0 ? (this.value() / this.max()) * 100 : 0,
  );
}
