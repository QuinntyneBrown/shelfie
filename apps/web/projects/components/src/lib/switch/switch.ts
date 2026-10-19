import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';

/** One on or off choice with a short label, drawn on a native checkbox. */
@Component({
  selector: 'sh-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  readonly label = input.required<string>();
  readonly name = input<string | null>(null);
  readonly disabled = input(false);
  readonly checked = model(false);
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  constructor() {
    // Written to the box itself, not bound: a caller that sets it back within the same tick as the click would otherwise never see a change.
    afterRenderEffect(() => {
      this.box().nativeElement.checked = this.checked();
    });
  }

  protected toggle(event: Event) {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
