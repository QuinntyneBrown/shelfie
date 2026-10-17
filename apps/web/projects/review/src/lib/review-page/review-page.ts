import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'sh-review-page',
  templateUrl: './review-page.html',
  styleUrl: './review-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {}
