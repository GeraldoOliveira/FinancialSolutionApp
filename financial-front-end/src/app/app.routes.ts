import { Routes } from '@angular/router';
import { loginActivateGuard } from './features/auth/guards/login.guard';
import { registerActivateGuard, registerDeactivateGuard } from './features/auth/guards/register.guard';
import { expenseTransactionDeactivateGuard } from './features/expense/guards/expense-transaction.guard';
import { ExpenseResolve } from './features/expense/services/expense.resolve';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(c => c.Dashboard) },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(c => c.Login),
    canActivate: [loginActivateGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(c => c.Register),
    canActivate: [registerActivateGuard],
    canDeactivate: [registerDeactivateGuard]
  },
  {
    path: 'expense/new',
    loadComponent: () => import('./features/expense/components/expense-transaction/expense-transaction').then(c => c.ExpenseTransaction),
    canDeactivate: [expenseTransactionDeactivateGuard]
  },
  {
    path: 'expense/list',
    loadComponent: () => import('./features/expense/components/expense-list/expense-list').then(c => c.ExpenseList),
    // canDeactivate: [expenseTransactionDeactivateGuard]
  },
  {
    path: 'expense/edit/:id',
    loadComponent: () => import('./features/expense/components/expense-edit/expense-edit').then(c => c.ExpenseEdit),
    resolve: {
      expense: ExpenseResolve
    }
    // canDeactivate: [expenseTransactionDeactivateGuard]
  },
  {
    path: 'expense/details/:id',
    loadComponent: () => import('./features/expense/components/expense-details/expense-details').then(c => c.ExpenseDetails),
    resolve: {
      expense: ExpenseResolve
    }
  },
  {
    path: 'expense/delete/:id',
    loadComponent: () => import('./features/expense/components/expense-delete/expense-delete').then(c => c.ExpenseDelete),
    resolve: {
      expense: ExpenseResolve
    }
  },
  { path: "**", loadComponent: () => import('./shared/components/not-found/not-found').then(c => c.NotFound) }
];