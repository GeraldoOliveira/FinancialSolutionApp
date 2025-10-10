import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, ViewChildren, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule  } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CustomValidators } from 'ng2-validation';
import { fromEvent, merge, Observable } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../shared/utils/generic-form-validation';
import { ExpenseTransactionService } from './services/expense-transaction.service';
import { Expense } from './models/expense-transaction';
import { ExpenseOrigin } from './models/expense-origin';
import { ExpenseResponsible } from './models/expense-responsible';

@Component({
  selector: 'app-expense-transaction',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './expense-transaction.html',
  styleUrl: './expense-transaction.css',
  providers: [ExpenseTransactionService]
})
export class ExpenseTransaction {

  @ViewChildren(FormControlName,  { read: ElementRef }) formInputElements: ElementRef[];

  errors: WritableSignal<any[]> = signal([]);
  expenseTransaction: Expense;
  expenseOrigin: ExpenseOrigin;
  expenseResposible: ExpenseResponsible;
  expenseForm!: FormGroup;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = {description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsibleList: '', proratedValue: '', categoryList: ''};

  changesNotSaved: boolean;

  constructor (private fb: FormBuilder,
               private expenseTransactionService: ExpenseTransactionService,
               private router: Router,
               private destroyRef: DestroyRef,
               private toastr: ToastrService, 
               private changeDetectorRef: ChangeDetectorRef ) { 
    this.validationMessages = {
      description: {
        required: 'Informe a descrição do gasto',
      },
      totalValue: {
        required: 'Informe o valor total',
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
      },
      categoryList: {
        required: 'Informe a categoria',
      },
    };

    this.genericValidator = new GenericValidator(this.validationMessages);

    this.destroyRef.onDestroy(() => {
      console.log('Componente _expenseTransaction está sendo destruído.');
    });

  }

  ngOnInit() {

   this.expenseForm = this.fb.group({
      description: ['', [Validators.required]],
      totalValue: ['', [Validators.required]],
      methodList: ['', [Validators.required]],
      creditCardList: ['', [Validators.required]],
      installments: ['', [Validators.required]],
      responsibleList: ['', [Validators.required]],
      proratedValue: ['', [Validators.required]],
      categoryList: ['', [Validators.required]],
    }); 
  }

  ngAfterViewInit(): void {
    let controlBlurs: Observable<any>[] = this.formInputElements
      .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));

    merge(...controlBlurs).subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.expenseForm);
      this.changesNotSaved = true;
    });
  }

  registerExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid) {
      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);
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
    this.expenseTransactionService.LocalStorage.saveLocalUser(response);
    let toastr = this.toastr.success('Registro realizado com sucesso!', 'Bem vindo!!!', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });
    if (toastr) {
      toastr.onHidden.subscribe(() => {
        this.router.navigate(['/login']);
      }),
      toastr.onTap.subscribe(() => {
        this.router.navigate(['/login']);
      })
    }
  }

  processFail(fail: any) {
    this.errors.set([]); 
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Registro de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
