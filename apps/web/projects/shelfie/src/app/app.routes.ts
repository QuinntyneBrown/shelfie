import { Routes } from '@angular/router';
import { authGuard } from 'core';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  { path: 'sign-in', loadComponent: () => import('sign-in').then((m) => m.SignInPage) },
  {
    path: 'review',
    canActivate: [authGuard],
    loadComponent: () => import('review').then((m) => m.ReviewPage),
  },
  {
    path: 'shelf',
    canActivate: [authGuard],
    loadComponent: () => import('shelf').then((m) => m.ShelfPage),
  },
  {
    path: 'books/:id/chapters/:n/log',
    canActivate: [authGuard],
    loadComponent: () => import('log-chapter').then((m) => m.LogChapterPage),
  },
];
