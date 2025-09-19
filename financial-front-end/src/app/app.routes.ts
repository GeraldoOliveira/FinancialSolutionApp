import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    // Correto: importa a classe do componente diretamente
    { path: 'home', loadComponent: () => import('./navigation/home/home').then(c => c.Home) },
    { path: 'register', loadComponent: () => import('./account/register/register').then(c => c.Register) },
    { path: 'login', loadComponent: () => import('./account/login/login').then(c => c.Login) }

];