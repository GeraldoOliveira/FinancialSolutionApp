import { Routes } from '@angular/router';
import { AccountApp } from './account.app.component';
import { Register } from './register/register';
import { Login } from '../navigation/login/login';

export const routes: Routes = [
    { path: '', component: AccountApp ,
      children:[
         { path: 'register', component: Register },
         { path: 'login', component: Login}
      ]
    },
    
];
