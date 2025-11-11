import { Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, of, Subscription, switchMap } from 'rxjs';
import { Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../../shared/utils/generic-form-validation';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseOrigin } from '../../../../shared/models/expense-origin';
import { ExpenseResponsible } from '../../../../shared/models/expense-responsible';
import { NgxBrazilMASKS, MaskedInputDirective } from 'ngx-brazil';
import { StringUtils } from '../../../../shared/utils/string-utils';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-expense-edit',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective],
  templateUrl: './expense-edit.html',
  styleUrl: './expense-edit.css'
})
export class ExpenseEdit {
  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  MASKS = NgxBrazilMASKS;

  private itemSubscriptions: Map<number, Subscription> = new Map();

  errors: WritableSignal<any[]> = signal([]);
  isWritableDescription: WritableSignal<boolean> = signal(false);
  expenseResposiblesArraySignal: WritableSignal<FormArray> = signal(
    new FormArray<any>([])
  );


  controlBlurs: Observable<any>[];

  expenseTransaction: Expense;
  expenseOrigin: ExpenseOrigin;
  expenseResponsibles: ExpenseResponsible;
  expenseForm!: FormGroup;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = { name: '', description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsible: '', proratedValue: '', categoryList: '', date: '' };

  changesNotSaved: boolean;
  expense: any;

  constructor(private fb: FormBuilder,
    private expenseTransactionService: ExpenseService,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
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
      responsible: {
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
      totalValue: this.expense.totalValue,
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

  expenseResposiblesArrayItem(): FormArray {
    return this.expenseForm.get('expenseResponsibles') as FormArray;
  }

  private unsubscribeAllItems(): void {
    this.itemSubscriptions.forEach(sub => sub.unsubscribe());
    this.itemSubscriptions.clear();
  }

  private subscribeToFormGroup(index: number): void {
    const formGroup = this.expenseResposiblesArraySignal().at(index) as FormGroup;

    const sub = formGroup.valueChanges.subscribe(value => {
      const differenceValue = this.differenceValueTotalWithProrated(index);

      if (value.proratedValue > differenceValue) {
        const proratedControl = formGroup.get('proratedValue');
        proratedControl.setValue(differenceValue, { emitEvent: false });
      }

    });

    this.itemSubscriptions.set(index, sub);
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
        proratedValue: responsible.proratedValue
      });
      arrayControl.push(responsibleGroup);

    });
  }

  private setupAllSubscriptions(): void {
    this.unsubscribeAllItems();
    this.expenseResposiblesArraySignal().controls.forEach((_, index) => {
      this.subscribeToFormGroup(index);
    });
  }

  ngAfterViewInit(): void {
    this.setupControlBlurObservable();

    this.formInputElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.setupControlBlurObservable();
      });
  }

  private getFormChild(childName: string): AbstractControl {
    return this.expenseForm.get(childName);
  }

  private handleCreditCardListChange(methodList: string): void {
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

  private handleProratedValueChange(totalValue: string): void {
    const proratedGroup = this.expenseResposiblesArraySignal();
    let cleanValue: number = parseFloat(StringUtils.justNumbers(totalValue));
    cleanValue = parseFloat(cleanValue.toFixed(0)) / parseFloat(proratedGroup.length.toString());

    if (proratedGroup.length > 0) {
      for (let i = 0; i < proratedGroup.length; i++) {
        const proratedChild = proratedGroup.at(i) as FormGroup;

        const proratedControl = proratedChild.get('proratedValue');
        if (totalValue && cleanValue > 0) {
          proratedControl.setValue((Math.round(cleanValue * 100) / 100), { emitEvent: false });
        } else {
          proratedControl.setValue(0, { emitEvent: false });
        }
      }
    }
  }

  private createExpenseResponsibleGroup(): FormGroup {
    return this.fb.group({
      responsibleId: ['', [Validators.required]],
      proratedValue: [0, [Validators.required]]
    });
  }

  addExpenseResponsible(): void {
    if (this.differenceValueTotalWithProrated() > 0) {
      const arrayControl = this.expenseResposiblesArraySignal();
      arrayControl.push(this.createExpenseResponsibleGroup());
      this.setupAllSubscriptions();
      this.completeValueAddExpenseResponsible();
    } else {
      this.toastr.error('Não há valores disponíveis para novos rateios!', 'Adição de responsável', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
    }

  }

  removeExpenseResponsible(): void {
    const arrayControl = this.expenseResposiblesArraySignal();
    if (arrayControl.length > 1) {
      arrayControl.removeAt(arrayControl.length - 1);
      this.setupAllSubscriptions();
    } else {
      this.toastr.error('É necessário ao menos um responsável.', 'Remoção de responsável', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
    }
  }

  private completeValueAddExpenseResponsible(): void {
    const arrayControl = this.expenseResposiblesArraySignal();
    const lastProratedControl = arrayControl.at(arrayControl.length - 1)?.get('proratedValue');

    if (lastProratedControl) {
      lastProratedControl.setValue(this.differenceValueTotalWithProrated(), { emitEvent: false });
    }
  }

  private differenceValueTotalWithProrated(index: number = -1): number {
    const arrayControl = this.expenseResposiblesArraySignal();
    let valueTotalCompleted: number = 0;

    const totalValueRaw = this.expenseForm.get('totalValue')?.getRawValue() as string;
    const totalNumericValue = parseFloat(StringUtils.justNumbers(totalValueRaw)) || 0;

    if (arrayControl.length > 0) {
      for (let i = 0; i < arrayControl.length; i++) {
        const proratedChild = arrayControl.at(i) as FormGroup;
        const proratedControl = proratedChild.get('proratedValue');

        if (proratedControl && i != index) {
          const proratedRaw: string = proratedControl.getRawValue() as string;
          const proratedNumericValue = parseFloat(StringUtils.justNumbers(proratedRaw.toString())) || 0;
          valueTotalCompleted += proratedNumericValue;
        }
      }

      let remainingValue = totalNumericValue - valueTotalCompleted;
      const finalValueToSet: number = Math.round(remainingValue * 100) / 100;

      return finalValueToSet;
    } else {
      return 0;
    }
  }

  private setupControlBlurObservable() {

    const elementsChange$ = merge(
      of(this.formInputElements),
      this.formInputElements.changes
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((list: QueryList<ElementRef>) => {
        const controlBlurs = list.toArray()
          .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));
        return merge(...controlBlurs);
      })
    );

    elementsChange$.subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.expenseForm);
      this.changesNotSaved = true;
    });

  }

  changeWritableDescription(): void {
    this.isWritableDescription.update(value => !value);
  }

  updateExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid) {

      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);
      this.expenseTransaction.totalValue = StringUtils.justNumbers(this.expenseTransaction.totalValue);

      this.expenseTransaction.expenseResponsibles.forEach(element => {
        element.proratedValue = parseFloat(StringUtils.justNumbers(element.proratedValue.toString()));
        element.responsibleId = parseFloat(StringUtils.justNumbers(element.responsibleId.toString()));
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
    this.toastr.success('Gasto atualizado com sucesso!', 'Ataulização de transação', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });

    this.router.navigate(['/expense/list']);

  }

  processFail(fail: any) {

    this.errors.set([]);
    this.errors.set(fail.error.errors.map((error: any) => error['msg']));
    this.toastr.error('Ocorreu um erro!', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }
}
