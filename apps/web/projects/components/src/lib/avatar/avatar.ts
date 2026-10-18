import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

/**
 * A person's avatar: their initial on their colour, with their photo over it when they have one.
 * A photo that fails to load is dropped, so the initial shows instead of a broken image.
 * Decorative unless given a `label`, because a name or a labelled control sits beside it.
 */
@Component({
  selector: 'sh-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-hidden]': 'label() ? null : true',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label()',
    '[attr.aria-busy]': 'busy() || null',
  },
})
export class Avatar {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly photo = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly busy = input(false);
  readonly label = input<string | null>(null);

  protected readonly initial = computed(() => this.name().charAt(0).toUpperCase());
  protected readonly classes = computed(
    () => `avatar avatar--${this.color()}` + (this.size() === 'md' ? '' : ` avatar--${this.size()}`),
  );
  /** Set when the photo fails to load; a new photo tries again. */
  protected readonly broken = linkedSignal({ source: this.photo, computation: () => false });
}
