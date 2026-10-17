import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ErrorState } from 'components';
import { SessionService } from 'core';

@Component({
  selector: 'sh-server-error-page',
  imports: [ErrorState, RouterLink],
  templateUrl: './server-error-page.html',
  styleUrl: './server-error-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  private readonly router = inject(Router);

  /** Query parameters: the code to quote, and the URL that failed. */
  readonly requestId = input<string>();
  readonly from = input<string>();
  protected readonly role = inject(SessionService).current()?.role;

  protected tryAgain() {
    this.router.navigateByUrl(this.from() || '/');
  }
}
