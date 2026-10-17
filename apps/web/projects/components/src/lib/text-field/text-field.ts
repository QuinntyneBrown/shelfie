import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

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

  protected edit(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
