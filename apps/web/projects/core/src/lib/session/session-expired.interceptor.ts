import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';

/** When the API says the session ran out, forget it and go to sign-in with the reason. */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        error.error?.type === 'session-expired'
      ) {
        session.current.set(null);
        session.expired.set(true);
        router.navigate(['/sign-in'], { queryParams: { reason: 'expired' } });
      }
      return throwError(() => error);
    }),
  );
};
