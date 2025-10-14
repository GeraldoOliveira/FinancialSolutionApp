import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, ViewChildren, signal, WritableSignal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { fromEvent, merge, Observable } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../shared/utils/generic-form-validation';
import { ExpenseTransactionService } from './services/expense-transaction.service';
import { Expense } from './models/expense-transaction';
import { ExpenseOrigin } from './models/expense-origin';
import { ExpenseResponsible } from './models/expense-responsible';
import { NgxBrazilValidators, NgxBrazilMASKS, MaskedInputDirective } from 'ngx-brazil';
import { StringUtils } from '../../shared/utils/string-utils';

interface Item {
  id: number;
  name: string;
}

@Component({
  selector: 'app-expense-transaction',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective],
  templateUrl: './expense-transaction.html',
  styleUrl: './expense-transaction.css',
  providers: [ExpenseTransactionService]
})
export class ExpenseTransaction {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: ElementRef[];

  MASKS = NgxBrazilMASKS;

  errors: WritableSignal<any[]> = signal([]);
  expenseTransaction: Expense;
  expenseOrigin: ExpenseOrigin;
  expenseResposible: ExpenseResponsible;
  expenseForm!: FormGroup;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = { name: '', description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsibleList: '', proratedValue: '', categoryList: '', date: '' };

  changesNotSaved: boolean;
  isWritableDescription: WritableSignal<boolean> = signal(false);

  constructor(private fb: FormBuilder,
    private expenseTransactionService: ExpenseTransactionService,
    private router: Router,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
    private changeDetectorRef: ChangeDetectorRef) {
    this.validationMessages = {
      name: {
        required: 'Informe o nome do gasto',
      },
      description: {
        required: 'Informe a descrição do gasto',
      },
      totalValue: {
        required: 'Informe o valor total',
        number: 'Valor deve ser numérico'
      },
      methodList: {
        required: 'Informe o método de pagamento',
      },
      creditCardList: {
        required: 'Informe o cartão de crédito',
      },
      installments: {
        required: 'Informe o parcelamento',
      },
      responsibleList: {
        required: 'Informe o responsável',
      },
      proratedValue: {
        required: 'Informe o valor de rateio',
        number: 'Valor deve ser numérico'
      },
      categoryList: {
        required: 'Informe a categoria',
      },
      date: {
        required: 'Informe a data do gasto',
      },
    };

    this.genericValidator = new GenericValidator(this.validationMessages);

    this.destroyRef.onDestroy(() => {
      console.log('Componente _expenseTransaction está sendo destruído.');
    });

  }

  ngOnInit() {
    this.expenseForm = this.fb.group({
      expenseOrigin: this.fb.group({
        name: ['', [Validators.required]],
        description: ['', [Validators.required]]
      }),
      totalValue: ['', [Validators.required], Validators.min(0.01)],
      methodList: ['', [Validators.required]],
      creditCardList: ['', [Validators.required]],
      installments: ['', [Validators.required]],
      expenseResponsible: this.fb.group({
        responsibleList: ['', [Validators.required]],
        proratedValue: ['', [Validators.required], Validators.min(0.01)]
      }),
      categoryList: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });

    this.expenseForm.patchValue({
      creditCardList: null,
      installments: '1',
      methodList: '1',
    });

    this.expenseForm.get('methodList')?.valueChanges
      .subscribe(value => {
        this.handleCreditCardListChange(value);
      });

    this.expenseForm.get('totalValue')?.valueChanges
      .subscribe(value => {
        this.handleProratedValueChange(value);
      });
  }

  getFormChild(childName: string): AbstractControl {
    return this.expenseForm.get(childName);
  }
  handleCreditCardListChange(methodList: string): void {
    if (methodList === '1') {
      this.getFormChild("creditCardList")?.setValidators(Validators.required);
      this.getFormChild("installmentsControl")?.setValidators(Validators.required);
      this.getFormChild("creditCardList")?.setValue('');
    } else {
      this.getFormChild("creditCardList")?.clearValidators();
      this.getFormChild("installmentsControl")?.clearValidators();
      this.getFormChild("creditCardList")?.setValue('None');
    }
    this.getFormChild("creditCardList")?.updateValueAndValidity();
    this.getFormChild("installmentsControl")?.updateValueAndValidity();
  }
  handleProratedValueChange(totalValue: number): void {
    const proratedValue = this.expenseForm.get('expenseResponsible.proratedValue');

    if (totalValue && totalValue > 0) {
      proratedValue?.setValue(totalValue);
    }
  }

  ngAfterViewInit(): void {
    let controlBlurs: Observable<any>[] = this.formInputElements
      .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));

    merge(...controlBlurs).subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.expenseForm);
      this.changesNotSaved = true;
    });
  }

  changeWritableDescription(): void {
    this.isWritableDescription.update(value => !value);
  }

  registerExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid) {

      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);

      this.expenseTransaction.totalValue = StringUtils.justNumbers(this.expenseTransaction.totalValue);
      this.expenseTransaction.expenseResponsible.proratedValue = StringUtils.justNumbers(this.expenseTransaction.expenseResponsible.proratedValue);

      this.expenseTransactionService.registerExpense(this.expenseTransaction)
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (success) => {
            this.processSuccess(success)
          },
          error: (fail) => {
            this.processFail(fail)
          },
          complete: () => {
            this.changesNotSaved = false;
          }
        })
    }
  }

  processSuccess(response: Expense) {
    this.expenseForm.reset();
    this.errors.set([]);
    this.toastr.success('Registro realizado com sucesso!', 'Bem vindo!!!', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });

  }

  processFail(fail: any) {
    this.errors.set([]);
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Registro de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
