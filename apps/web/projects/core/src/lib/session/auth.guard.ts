import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Sends anyone without a session to the sign-in page, and an author or volunteer away from household pages (ADR-0019). */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const role = session.current()?.role;
  if (role === 'author' || role === 'volunteer')
    return inject(Router).createUrlTree(['/forbidden']);
  if (role) return true;
  const queryParams = session.expired() ? { reason: 'expired' } : {};
  return inject(Router).createUrlTree(['/sign-in'], { queryParams });
};
