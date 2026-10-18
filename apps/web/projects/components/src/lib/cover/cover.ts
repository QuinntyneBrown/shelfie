import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

/**
 * A book's cover: its sticker on its colour, with its cover picture over them when it has one.
 * A picture that fails to load is dropped, so the colour and sticker show instead of a broken image.
 */
@Component({
  selector: 'sh-cover',
  templateUrl: './cover.html',
  styleUrl: './cover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cover {
  readonly color = input.required<string>();
  readonly sticker = input.required<string>();
  readonly image = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  protected readonly classes = computed(
    () => `cover--${this.color()}${this.size() === 'md' ? '' : ' cover--' + this.size()}`,
  );
  /** Set when the picture fails to load; a new picture tries again. */
  protected readonly broken = linkedSignal({ source: this.image, computation: () => false });
}
