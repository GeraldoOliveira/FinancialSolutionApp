import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'home', loadComponent: () => import('./navigation/home/home').then(c => c.Home) },
    { path: 'register', loadComponent: () => import('./account/register/register').then(c => c.Register) },
    { path: 'login', loadComponent: () => import('./navigation/login/login').then(c => c.Login) },
    { path: "**", loadComponent: () => import('./navigation/not-found/not-found').then(c => c.NotFound) }

];