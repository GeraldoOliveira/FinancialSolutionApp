import { Component, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { FormArray, FormControlName, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExpenseService } from '../../services/expense.service';
import { MaskedInputDirective } from 'ngx-brazil';
import { CurrencyUtils } from '../../../../shared/utils/currency-utils';
import { ExpenseFormBaseComponent } from '../../services/expense-form.base.component';
import { Expense } from '../../../../shared/models/expense-transaction';

@Component({
  selector: 'app-expense-transaction',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective],
  templateUrl: './expense-transaction.html',
  styleUrl: './expense-transaction.css',
  providers: [DatePipe]
})
export class ExpenseTransaction extends ExpenseFormBaseComponent {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  errors: WritableSignal<any[]> = signal([]);
  constructor(private expenseTransactionService: ExpenseService) {
    super();

  }

  ngOnInit() {
    this.expenseForm = this.fb.group({
      expenseOrigin: this.fb.group({
        name: ['', [Validators.required]],
        description: ['', [Validators.required]]
      }),
      totalValue: ['', [Validators.required]],
      methodList: ['', [Validators.required]],
      creditCardList: ['', [Validators.required]],
      installments: ['', [Validators.required]],
      expenseResponsibles: this.fb.array([
        this.createExpenseResponsibleGroup()
      ]),
      categoryList: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });

    this.expenseForm.patchValue({
      creditCardList: null,
      installments: '1',
      methodList: '1',
      date: this.getCurrentDateTime()
    });

    this.expenseForm.get('methodList')?.valueChanges
      .subscribe(value => {
        this.handleCreditCardListChange(value);
      });

    this.expenseForm.get('totalValue').valueChanges
      .subscribe(value => {
        this.handleProratedValueChange(value);
      });

    const initialFormArray = this.expenseForm.get('expenseResponsibles') as FormArray;
    this.expenseResposiblesArraySignal.set(initialFormArray);
    this.setupAllSubscriptions();

  }

  ngAfterViewInit(): void {
    super.setupControlBlurObservable(this.formInputElements);

    this.formInputElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        super.setupControlBlurObservable(this.formInputElements);
      });
  }

  registerExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid && this.differenceValueTotalWithProrated() === 0) {

      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);

      // Converte o valor total de string formatada ("15,50") para decimal e depois para string
      const totalValueDecimal = CurrencyUtils.StringToDecimal(this.expenseTransaction.totalValue);
      this.expenseTransaction.totalValue = totalValueDecimal.toString();

      this.expenseTransaction.expenseResponsibles.forEach(element => {
        // Converte valores de rateio de string formatada para number
        element.proratedValue = CurrencyUtils.StringToDecimal(element.proratedValue.toString());
        element.responsibleId = parseFloat(element.responsibleId.toString());
      })

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
            console.log(this.expenseTransaction)
            this.changesNotSaved = false;
          }
        })
    } else {
      this.toastr.error('Valor de rateio dos responsáveis deve ser igual ao valor total do gasto.', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
    }
  }

  processSuccess(response: Expense) {

    const arrayControl = this.expenseResposiblesArraySignal();
    arrayControl.clear();
    arrayControl.push(this.createExpenseResponsibleGroup());

    this.expenseForm.setControl('expenseResponsibles', arrayControl);

    this.setupAllSubscriptions();

    this.expenseForm.reset({
      creditCardList: null,
      installments: '1',
      methodList: '1',
      totalValue: '0',
      date: this.getCurrentDateTime()
    });

    this.errors.set([]);
    this.toastr.success('Gasto registrado com sucesso!', 'Lançamento de transação', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });

  }

  processFail(fail: any) {
    this.errors.set([]);
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
