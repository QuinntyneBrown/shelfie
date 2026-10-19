import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService, homeOf } from './session.service';

/** Lets only an author or volunteer through to their own pages; anyone else signed in goes to their own home. */
export const directoryAccountGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const role = session.current()?.role;
  if (role === 'author' || role === 'volunteer') return true;
  if (!role)
    return inject(Router).createUrlTree(['/sign-in'], {
      queryParams: session.expired() ? { reason: 'expired' } : {},
    });
  return inject(Router).createUrlTree([homeOf(role)]);
};
