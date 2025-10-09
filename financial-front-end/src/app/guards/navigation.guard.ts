import { CanActivateFn, CanDeactivateFn, GuardResult, Router } from '@angular/router';
import { LocalStorageUtils } from '../utils/localstorage';
import { inject } from '@angular/core';

export const navigationActivateGuard: CanActivateFn = () => {

    const router = inject(Router);
    const localStorageUtils = new LocalStorageUtils();

    if (localStorageUtils.getUserToken()) {
        return router.createUrlTree(['/home']);
    }
    return true;
}