import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorState } from 'components';

@Component({
  selector: 'sh-offline-page',
  imports: [ErrorState],
  templateUrl: './offline-page.html',
  styleUrl: './offline-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflinePage {
  private readonly router = inject(Router);

  /** Query parameter: the page that could not load. */
  readonly from = input<string>();

  protected tryAgain() {
    this.router.navigateByUrl(this.from() || '/');
  }
}
