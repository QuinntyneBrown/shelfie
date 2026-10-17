import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'sh-cover',
  templateUrl: './cover.html',
  styleUrl: './cover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cover {
  readonly color = input.required<string>();
  readonly sticker = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly classes = computed(() => `cover--${this.color()}${this.size() === 'md' ? '' : ' cover--' + this.size()}`);
}
