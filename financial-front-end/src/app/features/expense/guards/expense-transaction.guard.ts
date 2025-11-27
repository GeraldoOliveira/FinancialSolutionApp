import { ActivatedRouteSnapshot, CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { LocalStorageUtils } from '../../../shared/utils/local-storage';
import { inject } from '@angular/core';

interface ComponentWithUnsavedChanges {
  changesNotSaved: boolean;
}

export const expenseTransactionDeactivateGuard: CanDeactivateFn<ComponentWithUnsavedChanges> = (component) => {
  if (component.changesNotSaved) {
    return window.confirm('Tem certeza que deseja abandonar o preenchimento do formulário? As alterações não salvas serão perdidas.');
  }
  return true;
};

export const expenseTransactionActivateGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {

  const localStorage = new LocalStorageUtils();
  const router = inject(Router);

  if (!localStorage.getUserToken()) {
    router.navigate(['/login']);
    return false;
  }

  let userClaimsStorage: any = localStorage.getUserClaims();
  let claim: any = route.data[0]

  if (claim !== undefined) {
    if (claim) {
      if (!userClaimsStorage) {
        return accessDeniedNavigate();
      }

      let userClaims = userClaimsStorage.find(x => x.type === claim.claim.type);
      if (!userClaims) {
        return accessDeniedNavigate();
      }

      let claimsValues = userClaims.value.split(',');
      if (!claimsValues.includes(claim.claim.value)) {
        return accessDeniedNavigate();
      }

    }
    return true;
  } else {
    return false;
  };

  function accessDeniedNavigate() {
    router.navigate(['/access-denied']);
    return false;
  }
}

