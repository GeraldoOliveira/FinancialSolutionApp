import { CanActivateFn, CanDeactivateFn, GuardResult, Router } from '@angular/router';
import { validateToken } from '../../../core/services/base.guard';

export const loginActivateGuard: CanActivateFn = () => {

    return validateToken();

}