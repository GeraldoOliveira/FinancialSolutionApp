import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { LocalStorageUtils } from '../utils/localstorage';
import { inject } from '@angular/core';

interface ComponentWithUnsavedChanges {
  changesNotSaved: boolean;
}

export const accountDeactivateGuard: CanDeactivateFn<ComponentWithUnsavedChanges> = (component) => {
    if (component.changesNotSaved) {
        return window.confirm('Tem certeza que deseja abandonar o preenchimento do formulário? As alterações não salvas serão perdidas.');
    }
    return true;
};

export const accountActivateGuard: CanActivateFn = () => {

    const router = inject(Router);

    let localStorageUtils = new LocalStorageUtils();
    if (localStorageUtils.getUserToken()) {
        return router.createUrlTree(['/login']);
    }
    
    return true;
};