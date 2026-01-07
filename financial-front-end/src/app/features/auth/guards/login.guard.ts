import {
  CanActivateFn,
  CanDeactivateFn,
  GuardResult,
  Router,
} from '@angular/router';
import { authenticated } from '../../../core/services/base.guard';

export const loginActivateGuard: CanActivateFn = () => {
  return authenticated();
};
