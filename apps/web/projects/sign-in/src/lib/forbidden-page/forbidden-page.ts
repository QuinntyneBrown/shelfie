import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
  /** An author or volunteer reached a family's page (ADR-0020). */
  protected readonly family = computed(() =>
    ['author', 'volunteer'].includes(this.session.current()?.role ?? ''),
  );

  protected async signOut() {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }
}
