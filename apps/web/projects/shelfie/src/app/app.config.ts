import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  GlobalErrorHandler,
  OfflineQueue,
  SessionService,
  ThemeService,
  sessionExpiredInterceptor,
} from 'core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(OfflineQueue);
      return inject(SessionService).restore();
    }),
  ],
};
