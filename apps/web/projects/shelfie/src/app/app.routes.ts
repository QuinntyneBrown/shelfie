import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  { path: 'sign-in', loadComponent: () => import('sign-in').then((m) => m.SignInPage) },
  { path: 'shelf', loadComponent: () => import('shelf').then((m) => m.ShelfPage) },
];
