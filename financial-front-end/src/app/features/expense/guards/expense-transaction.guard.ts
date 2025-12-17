import { ActivatedRouteSnapshot, CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { validateClaims } from '../../../core/services/base.guard';

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
  return validateClaims(route);
}

