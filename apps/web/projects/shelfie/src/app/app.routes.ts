import { Routes } from '@angular/router';
import { authGuard, authorGuard, directoryAccountGuard, grownUpGuard, signedOutGuard } from 'core';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  {
    path: 'sign-in',
    canActivate: [signedOutGuard],
    loadComponent: () => import('sign-in').then((m) => m.SignInPage),
  },
  { path: 'sign-up', loadComponent: () => import('sign-in').then((m) => m.SignUpPage) },
  { path: 'join', loadComponent: () => import('sign-in').then((m) => m.JoinPage) },
  {
    path: 'me',
    canActivate: [directoryAccountGuard],
    loadComponent: () => import('directory').then((m) => m.MyProfilePage),
  },
  {
    path: 'directory',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('directory').then((m) => m.DirectoryPage),
  },
  {
    path: 'directory/authors/:id',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('directory').then((m) => m.AuthorProfilePage),
  },
  {
    path: 'directory/volunteers/:id',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('directory').then((m) => m.VolunteerProfilePage),
  },
  {
    path: 'catalogue',
    canActivate: [authorGuard],
    loadComponent: () => import('directory').then((m) => m.MyCataloguePage),
  },
  {
    path: 'accept-invite',
    loadComponent: () => import('sign-in').then((m) => m.AcceptInvitePage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('sign-in').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('sign-in').then((m) => m.ResetPasswordPage),
  },
  { path: 'offline', loadComponent: () => import('sign-in').then((m) => m.OfflinePage) },
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
    path: 'review/chapters/:id',
    canActivate: [authGuard, grownUpGuard],
    loadComponent: () => import('review').then((m) => m.ReviewChapterPage),
  },
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
