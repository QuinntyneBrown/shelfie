import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'sh-textarea',
  templateUrl: './textarea.html',
  styleUrl: './textarea.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Textarea {
  readonly label = input.required<string>();
  readonly help = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly rows = input(3);
  readonly value = model('');

  protected readonly id = `sh-textarea-${nextId++}`;
  protected readonly describedBy = computed(() => {
    const ids = [
      this.help() ? this.id + '-help' : null,
      this.error() ? this.id + '-error' : null,
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });

  protected edit(event: Event) {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
