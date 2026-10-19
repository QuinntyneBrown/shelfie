import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService, homeOf } from './session.service';

/** Lets only an author through to their catalogue; anyone else signed in goes to their own home. */
export const authorGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const role = session.current()?.role;
  if (role === 'author') return true;
  if (!role)
    return inject(Router).createUrlTree(['/sign-in'], {
      queryParams: session.expired() ? { reason: 'expired' } : {},
    });
  return inject(Router).createUrlTree([homeOf(session.current()!)]);
};
