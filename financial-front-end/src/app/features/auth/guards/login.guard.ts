import { CanActivateFn, CanDeactivateFn, GuardResult, Router } from '@angular/router';
import { LocalStorageUtils } from '../../../shared/utils/localstorage';
import { inject } from '@angular/core';

export const loginActivateGuard: CanActivateFn = () => {

    const router = inject(Router);
    const localStorageUtils = new LocalStorageUtils();

    if (localStorageUtils.getUserToken()) {
        return router.createUrlTree(['/dashboard']);
    }
    return true;
}