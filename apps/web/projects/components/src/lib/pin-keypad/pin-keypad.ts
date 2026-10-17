import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'sh-pin-keypad',
  templateUrl: './pin-keypad.html',
  styleUrl: './pin-keypad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinKeypad {
  readonly name = input.required<string>();
  readonly complete = output<string>();
  readonly switchReader = output<void>();

  protected readonly digits = signal('');
  protected readonly slots = [0, 1, 2, 3];
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  protected add(digit: string) {
    if (this.digits().length >= 4) return;
    const next = this.digits() + digit;
    this.digits.set(next);
    if (next.length === 4) this.complete.emit(next);
  }

  protected remove() {
    this.digits.update((d) => d.slice(0, -1));
  }
}
