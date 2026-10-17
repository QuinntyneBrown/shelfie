import { Routes } from '@angular/router';
import { authGuard, grownUpGuard } from 'core';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  { path: 'sign-in', loadComponent: () => import('sign-in').then((m) => m.SignInPage) },
  {
    path: 'forgot-password',
    loadComponent: () => import('sign-in').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('sign-in').then((m) => m.ResetPasswordPage),
  },
  { path: 'error', loadComponent: () => import('sign-in').then((m) => m.ServerErrorPage) },
  {
    path: 'settings',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('settings').then((m) => m.SettingsPage),
  },
  {
    path: 'books',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('books').then((m) => m.BooksPage),
  },
  {
    path: 'manage-book/:id',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('books').then((m) => m.ManageBookPage),
  },
  {
    path: 'chapter-logs/:id',
    canActivate: [authGuard],
    loadComponent: () => import('log-chapter').then((m) => m.ChapterPage),
  },
  { path: 'forbidden', loadComponent: () => import('sign-in').then((m) => m.ForbiddenPage) },
  {
    path: 'review',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('review').then((m) => m.ReviewPage),
  },
  {
    path: 'add-book',
    canActivate: [authGuard],
    loadComponent: () => import('shelf').then((m) => m.AddBookPage),
  },
  {
    path: 'book/:id',
    canActivate: [authGuard],
    loadComponent: () => import('shelf').then((m) => m.BookPage),
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
  { path: '**', loadComponent: () => import('sign-in').then((m) => m.NotFoundPage) },
];
