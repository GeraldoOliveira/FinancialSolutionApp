import { Component, ElementRef, ViewChildren, WritableSignal, QueryList, signal } from '@angular/core';
import { FormArray, FormControlName, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseResponsible } from '../../../../shared/models/expense-responsible';
import { MaskedInputDirective } from 'ngx-brazil';
import { CurrencyUtils } from '../../../../shared/utils/currency-utils';
import { ActivatedRoute } from '@angular/router';
import { ExpenseFormBaseComponent } from '../../services/expense-form.base.component';

@Component({
  selector: 'app-expense-edit',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective],
  templateUrl: './expense-edit.html',
  styleUrl: './expense-edit.css',
  providers: [DatePipe]
})
export class ExpenseEdit extends ExpenseFormBaseComponent {
  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  errors: WritableSignal<any[]> = signal([]);

  expense: any;

  constructor(private expenseTransactionService: ExpenseService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    super();

    this.expense = this.route.snapshot.data['expense'];
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
      expenseResponsibles: this.fb.array([]),
      categoryList: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });

    this.setExpenseResponsiblesForEdit(this.expense.expenseResponsibles);

    this.expenseForm.patchValue({
      expenseOrigin: this.expense.expenseOrigin,
      totalValue: CurrencyUtils.DecimalToString(parseFloat(this.expense.totalValue)),
      methodList: this.expense.methodList,
      creditCardList: this.expense.creditCardList,
      installments: this.expense.installments,
      expenseResponsibles: this.expense.expenseResponsibles,
      categoryList: this.expense.categoryList,
      date: this.expense.date
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

  private setExpenseResponsiblesForEdit(responsibles: ExpenseResponsible[]): void {
    const arrayControl = this.expenseForm.get('expenseResponsibles') as FormArray;

    if (!responsibles || responsibles.length === 0) {
      arrayControl.push(this.createExpenseResponsibleGroup());
      return;
    }

    responsibles.forEach(responsible => {
      const responsibleGroup = this.createExpenseResponsibleGroup();
      responsibleGroup.patchValue({
        responsibleId: responsible.responsibleId,
        proratedValue: CurrencyUtils.DecimalToString(responsible.proratedValue)
      });
      arrayControl.push(responsibleGroup);

    });
  }

  ngAfterViewInit(): void {
    super.setupControlBlurObservable(this.formInputElements);

    this.formInputElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.setupControlBlurObservable(this.formInputElements);
      });
  }

  updateExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid) {

      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);

      const totalValueDecimal = CurrencyUtils.StringToDecimal(this.expenseTransaction.totalValue);
      this.expenseTransaction.totalValue = totalValueDecimal.toString();

      this.expenseTransaction.expenseResponsibles.forEach(element => {
        element.proratedValue = CurrencyUtils.StringToDecimal(element.proratedValue.toString());
        element.responsibleId = parseFloat(element.responsibleId.toString());
      })

      this.expenseTransactionService.updateExpense(this.expense.id.toString(),
        this.expenseTransaction)
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
    }
  }

  processSuccess(response: Expense) {

    this.errors.set([]);
    this.toastr.success('Gasto atualizado com sucesso!', 'Atualização de transação', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });

    this.router.navigate(['/expense/list']);

  }

  processFail(fail: any) {

    this.errors.set([]);
    this.errors.set(fail.error.errors.map((error: any) => error['msg']));
    this.toastr.error('Ocorreu um erro!', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }
}
