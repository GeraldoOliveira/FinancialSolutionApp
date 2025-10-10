import { Routes } from '@angular/router';
import { loginActivateGuard } from './features/auth/guards/login.guard';
import { registerActivateGuard, registerDeactivateGuard } from './features/auth/guards/register.guard';

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
      path: 'expense-transaction', 
      loadComponent: () => import('./features/expense-transaction/expense-transaction').then(c => c.ExpenseTransaction),
      // canActivate: [registerActivateGuard]
    },
    { path: "**", loadComponent: () => import('./shared/components/not-found/not-found').then(c => c.NotFound) }
];