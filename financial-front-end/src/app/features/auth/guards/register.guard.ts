import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { authenticated } from '../../../core/services/base.guard';

interface ComponentWithUnsavedChanges {
  changesNotSaved: boolean;
}

export const registerDeactivateGuard: CanDeactivateFn<
  ComponentWithUnsavedChanges
> = (component) => {
  if (component.changesNotSaved) {
    return window.confirm(
      'Tem certeza que deseja abandonar o preenchimento do formulário? As alterações não salvas serão perdidas.'
    );
  }
  return true;
};

export const registerActivateGuard: CanActivateFn = () => {
  return authenticated();
};
