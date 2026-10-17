import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  { path: 'sign-in', loadComponent: () => import('sign-in').then((m) => m.SignInPage) },
  { path: 'review', loadComponent: () => import('review').then((m) => m.ReviewPage) },
  { path: 'shelf', loadComponent: () => import('shelf').then((m) => m.ShelfPage) },
  {
    path: 'books/:id/chapters/:n/log',
    loadComponent: () => import('log-chapter').then((m) => m.LogChapterPage),
  },
];
