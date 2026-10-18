import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextGroup = 0;

@Component({
  selector: 'sh-color-picker',
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
  readonly label = input.required<string>();
  readonly colors = input.required<string[]>();
  readonly value = model.required<string>();
  protected readonly group = `sh-color-picker-${nextGroup++}`;
}
