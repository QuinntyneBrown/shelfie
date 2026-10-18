import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'sh-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly autocomplete = input<string | null>(null);
  readonly help = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly readonly = input(false);
  /** Takes focus when it appears, e.g. as the first field of a dialog. */
  readonly autofocus = input(false);
  readonly value = model('');

  private readonly id = `sh-text-field-${nextId++}`;
  protected readonly inputId = computed(() => this.id);
  protected readonly describedBy = computed(() => {
    const ids = [
      this.help() ? this.id + '-help' : null,
      this.error() ? this.id + '-error' : null,
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });
  /** A password field carries a Show button that reveals what was typed. */
  protected readonly revealed = signal(false);
  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
  protected readonly showLabel = computed(
    () => 'Show ' + this.label().replace(/\s*\(optional\)\s*$/i, '').toLowerCase(),
  );

  protected edit(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
