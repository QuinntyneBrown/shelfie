import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ErrorState } from 'components';
import { SessionService } from 'core';

@Component({
  selector: 'sh-forbidden-page',
  imports: [ErrorState, RouterLink],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected async switchReader() {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }
}
