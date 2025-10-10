import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { LocalStorageUtils } from '../../../shared/utils/localstorage';
import { inject } from '@angular/core';

interface ComponentWithUnsavedChanges {
  changesNotSaved: boolean;
}

export const registerDeactivateGuard: CanDeactivateFn<ComponentWithUnsavedChanges> = (component) => {
    if (component.changesNotSaved) {
        return window.confirm('Tem certeza que deseja abandonar o preenchimento do formulário? As alterações não salvas serão perdidas.');
    }
    return true;
};

export const registerActivateGuard: CanActivateFn = () => {

    const router = inject(Router);

    let localStorageUtils = new LocalStorageUtils();
    if (localStorageUtils.getUserToken()) {
        return router.createUrlTree(['/login']);
    }
    
    return true;
};