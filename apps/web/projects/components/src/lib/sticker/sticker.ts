import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

/**
 * A decorative sticker: an emoji in a circle, with a picture over it when there is one. A picture
 * that fails to load is dropped, so the emoji shows instead of a broken image.
 */
@Component({
  selector: 'sh-sticker',
  templateUrl: './sticker.html',
  styleUrl: './sticker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sticker {
  readonly emoji = input.required<string>();
  readonly image = input<string | null>(null);
  readonly size = input<'md' | 'lg'>('md');
  /** Set when the picture fails to load; a new picture tries again. */
  protected readonly broken = linkedSignal({ source: this.image, computation: () => false });
}
