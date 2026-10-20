import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  readonly large = input(false);
  readonly block = input(false);
  readonly busy = input(false);
}
