import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'sh-pin-keypad',
  templateUrl: './pin-keypad.html',
  styleUrl: './pin-keypad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
})
export class PinKeypad {
  readonly name = input.required<string>();
  readonly error = input<string | null>(null);
  /** Epoch ms until which the keypad is locked. */
  readonly lockedUntil = input<number | null>(null);
  readonly complete = output<string>();
  readonly switchReader = output<void>();

  protected readonly digits = signal('');
  private readonly now = signal(Date.now());
  protected readonly remainingMs = computed(() =>
    Math.max(0, (this.lockedUntil() ?? 0) - this.now()),
  );
  protected readonly locked = computed(() => this.remainingMs() > 0);
  protected readonly timeLeft = computed(() => {
    const seconds = Math.ceil(this.remainingMs() / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });
  protected readonly slots = [0, 1, 2, 3];
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  constructor() {
    effect((onCleanup) => {
      if (this.lockedUntil() === null) return;
      this.now.set(Date.now());
      const id = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(id));
    });
  }

  protected add(digit: string) {
    if (this.locked() || this.digits().length >= 4) return;
    const next = this.digits() + digit;
    this.digits.set(next);
    if (next.length === 4) this.complete.emit(next);
  }

  clear() {
    this.digits.set('');
  }

  protected onKey(event: KeyboardEvent) {
    if (/^[0-9]$/.test(event.key)) this.add(event.key);
    else if (event.key === 'Backspace') this.remove();
  }

  protected remove() {
    this.digits.update((d) => d.slice(0, -1));
  }
}
