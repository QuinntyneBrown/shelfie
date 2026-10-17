import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-banner',
  templateUrl: './banner.html',
  styleUrl: './banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Banner {
  readonly severity = input<'info' | 'success' | 'warning' | 'danger'>('success');
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
}
