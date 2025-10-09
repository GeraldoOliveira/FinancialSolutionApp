import { Routes } from '@angular/router';
import { accountActivateGuard, accountDeactivateGuard } from './guards/account.guard';
import { navigationActivateGuard } from './guards/navigation.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'home', loadComponent: () => import('./navigation/home/home').then(c => c.Home) },
    { 
      path: 'login', 
      loadComponent: () => import('./navigation/login/login').then(c => c.Login),
      canActivate: [navigationActivateGuard]
    },
    { 
      path: 'account/register', 
      loadComponent: () => import('./account/register/register').then(c => c.Register),
      canActivate: [accountActivateGuard],
      canDeactivate: [accountDeactivateGuard]
    },
    { path: "**", loadComponent: () => import('./navigation/not-found/not-found').then(c => c.NotFound) }
];