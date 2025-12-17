import { Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, of, Subscription, switchMap } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { ExpenseService } from '../../services/expense.service';
import { MaskedInputDirective } from 'ngx-brazil';
import { StringUtils } from '../../../../shared/utils/string-utils';
import { ExpenseFormBaseComponent } from '../../services/expense-form.base.component';
import { Expense } from '../../../../shared/models/expense-transaction';

@Component({
  selector: 'app-expense-transaction',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective],
  templateUrl: './expense-transaction.html',
  styleUrl: './expense-transaction.css',
  providers: []
})
export class ExpenseTransaction extends ExpenseFormBaseComponent {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  private itemSubscriptions: Map<number, Subscription> = new Map();

  errors: WritableSignal<any[]> = signal([]);
  isWritableDescription: WritableSignal<boolean> = signal(false);
  expenseResposiblesArraySignal: WritableSignal<FormArray> = signal(
    new FormArray<any>([])
  );

  controlBlurs: Observable<any>[];

  changesNotSaved: boolean;

  constructor(private fb: FormBuilder,
    private expenseTransactionService: ExpenseService,
    private destroyRef: DestroyRef,
    private toastr: ToastrService) {
    super();

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

      const newProratedRaw: string = value.proratedValue?.toString() || '0';
      const newProratedNumericValue = parseFloat(StringUtils.justNumbers(newProratedRaw)) || 0;
      const maxProratedValue = this.differenceValueTotalWithProrated(index);

      if (newProratedNumericValue > maxProratedValue) {
        const proratedControl = formGroup.get('proratedValue');
        proratedControl.setValue(maxProratedValue, { emitEvent: false });
      }
    });

    this.itemSubscriptions.set(index, sub);
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
    if (cleanValue.toString().includes(".")) {
      cleanValue = cleanValue * 10
    }

    if (proratedGroup.length > 0) {
      for (let i = 0; i < proratedGroup.length; i++) {
        const proratedChild = proratedGroup.at(i) as FormGroup;

        const proratedControl = proratedChild.get('proratedValue');
        if (totalValue && cleanValue > 0) {
          proratedControl.setValue(cleanValue, { emitEvent: false });
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

  registerExpense() {
    if (this.expenseForm.dirty && this.expenseForm.valid && this.differenceValueTotalWithProrated() === 0) {

      this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);
      this.expenseTransaction.totalValue = StringUtils.justNumbers(this.expenseTransaction.totalValue);

      this.expenseTransaction.expenseResponsibles.forEach(element => {
        element.proratedValue = parseFloat(StringUtils.justNumbers(element.proratedValue.toString()));
        element.responsibleId = parseFloat(StringUtils.justNumbers(element.responsibleId.toString()));
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
      totalValue: '0'
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
