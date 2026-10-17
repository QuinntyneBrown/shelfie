import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentedOption {
  value: string;
  label: string;
}

@Component({
  selector: 'sh-segmented',
  templateUrl: './segmented.html',
  styleUrl: './segmented.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented {
  readonly label = input.required<string>();
  readonly options = input.required<SegmentedOption[]>();
  readonly value = model.required<string>();
}
