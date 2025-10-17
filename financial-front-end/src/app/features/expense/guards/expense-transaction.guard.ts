import { CanDeactivateFn } from '@angular/router';

interface ComponentWithUnsavedChanges {
  changesNotSaved: boolean;
}

export const expenseTransactionDeactivateGuard: CanDeactivateFn<ComponentWithUnsavedChanges> = (component) => {
    if (component.changesNotSaved) {
        return window.confirm('Tem certeza que deseja abandonar o preenchimento do formulário? As alterações não salvas serão perdidas.');
    }
    return true;
};
