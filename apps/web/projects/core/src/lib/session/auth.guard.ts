import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Sends anyone without a session to the sign-in page. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  if (session.current()) return true;
  const queryParams = session.expired() ? { reason: 'expired' } : {};
  return inject(Router).createUrlTree(['/sign-in'], { queryParams });
};
