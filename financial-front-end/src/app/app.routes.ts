import { Routes } from '@angular/router';
import { loginActivateGuard } from './features/auth/guards/login.guard';
import {
  registerActivateGuard,
  registerDeactivateGuard,
} from './features/auth/guards/register.guard';
import {
  expenseTransactionActivateGuard,
  expenseTransactionDeactivateGuard,
} from './features/expense/guards/expense-transaction.guard';
import { ExpenseResolve } from './features/expense/services/expense.resolve';
import { ProfileResolve } from './features/profile/services/profile.resolve';
import { validateToken } from './core/services/base.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((c) => c.Dashboard),
    canActivate: [validateToken],
  },

  {
    path: 'access-denied',
    loadComponent: () =>
      import('./shared/components/access-denied/access-denied').then(
        (c) => c.AccessDenied
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((c) => c.Login),
    canActivate: [loginActivateGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((c) => c.Register),
    canActivate: [registerActivateGuard],
    canDeactivate: [registerDeactivateGuard],
  },
  {
    path: 'expense/new',
    loadComponent: () =>
      import(
        './features/expense/components/expense-transaction/expense-transaction'
      ).then((c) => c.ExpenseTransaction),
    canDeactivate: [expenseTransactionDeactivateGuard],
    canActivate: [expenseTransactionActivateGuard],
    data: [{ claim: { type: 'Expense', value: 'Create' } }],
  },
  {
    path: 'expense/list',
    loadComponent: () =>
      import('./features/expense/components/expense-list/expense-list').then(
        (c) => c.ExpenseList
      ),
    canActivate: [validateToken],
    // canDeactivate: [expenseTransactionDeactivateGuard]
  },

  {
    path: 'expense/edit/:id',
    loadComponent: () =>
      import('./features/expense/components/expense-edit/expense-edit').then(
        (c) => c.ExpenseEdit
      ),
    resolve: {
      expense: ExpenseResolve,
    },
    canDeactivate: [expenseTransactionDeactivateGuard],
    canActivate: [expenseTransactionActivateGuard],
    data: [{ claim: { type: 'Expense', value: 'Edit' } }],
  },
  {
    path: 'expense/details/:id',
    loadComponent: () =>
      import(
        './features/expense/components/expense-details/expense-details'
      ).then((c) => c.ExpenseDetails),
    resolve: {
      expense: ExpenseResolve,
    },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import(
        './features/profile/components/profile-layout/profile-layout'
      ).then((c) => c.ProfileLayout),
    children: [
      {
        path: 'user/:id',
        loadComponent: () =>
          import(
            './features/profile/components/profile-user/profile-user'
          ).then((m) => m.ProfileUser),
        resolve: {
          user: ProfileResolve,
        },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import(
            './features/profile/components/profile-edit/profile-edit'
          ).then((m) => m.ProfileEdit),
        resolve: {
          user: ProfileResolve,
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import(
            './features/profile/components/profile-settings/profile-settings'
          ).then((m) => m.ProfileSettings),
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found').then((c) => c.NotFound),
  },
];
