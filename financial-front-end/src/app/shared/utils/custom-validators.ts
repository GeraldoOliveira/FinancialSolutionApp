import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  /**
   * Validador de intervalo de caracteres [min, max]
   * Retorna { rangeLength: true } se inválido, exatamente como esperado pelo GenericValidator
   */
  static rangeLength(range: [number, number]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const len = String(control.value).length;
      if (len < range[0] || len > range[1]) {
        return { rangeLength: true };
      }
      return null;
    };
  }

  /**
   * Validador para comparar se dois controles têm o mesmo valor (ex: senha e confirmação)
   * Retorna { equalTo: true } se diferente, exatamente como esperado pelo GenericValidator
   */
  static equalTo(otherControl: AbstractControl): ValidatorFn {
    let subscribed = false;
    return (control: AbstractControl): ValidationErrors | null => {
      if (!subscribed && otherControl && otherControl.valueChanges) {
        subscribed = true;
        otherControl.valueChanges.subscribe(() => {
          control.updateValueAndValidity({ emitEvent: false });
        });
      }
      if (!control.value && !otherControl?.value) {
        return null;
      }
      if (control.value !== otherControl?.value) {
        return { equalTo: true };
      }
      return null;
    };
  }
}
