import { LocalStorageUtils } from './local-storage';

export class ClaimsUtils {
  public checkExpenseClain(requiredValue: string): boolean {
    const localStorage = new LocalStorageUtils();
    const requiredClaims = { type: 'Expense', value: requiredValue };

    let userClaims = localStorage.getUserClaims();

    if (!userClaims || userClaims.length === 0) {
      return false;
    }

    let claimsValues = userClaims[0].value.split(',');
    if (!claimsValues.includes(requiredClaims.value)) {
      return false;
    }

    return true;
  }
}
