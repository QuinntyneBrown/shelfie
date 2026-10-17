import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  readonly tone = input<'info' | 'error'>('info');
}
