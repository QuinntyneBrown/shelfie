import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly variant = input<'title' | 'text' | 'cover'>('text');
}
