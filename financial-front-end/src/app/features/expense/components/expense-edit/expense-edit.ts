import { Component, ElementRef, ViewChild, ViewChildren, WritableSignal, QueryList, signal, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormControlName, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';

import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseResponsible } from '../../../../shared/models/expense-responsible';
import { MaskedInputDirective } from 'ngx-brazil';
import { CurrencyUtils } from '../../../../shared/utils/currency-utils';
import { ExpenseFormBaseComponent } from '../../services/expense-form.base.component';
import { CreditCardService } from '../../../cards/services/credit-card.service';
import { ReceiptUploaderComponent, ReceiptData } from '../receipt-uploader/receipt-uploader';
import { ReceiptAiService, AiReceiptAnalysisData } from '../../../../core/services/receipt-ai.service';

@Component({
  selector: 'app-expense-edit',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective, ReceiptUploaderComponent],
  templateUrl: './expense-edit.html',
  styleUrl: './expense-edit.css',
  providers: [DatePipe]
})
export class ExpenseEdit extends ExpenseFormBaseComponent {
  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;
  @ViewChild(ReceiptUploaderComponent) receiptUploader?: ReceiptUploaderComponent;

  errors: WritableSignal<any[]> = signal([]);
  attachedReceipt: WritableSignal<ReceiptData | null> = signal(null);
  isAiAnalyzing: WritableSignal<boolean> = signal(false);
  aiDetectedData: WritableSignal<AiReceiptAnalysisData | null> = signal(null);
  fullPurchaseTotal: WritableSignal<number | null> = signal(null);

  expense: any;

  constructor(
    private expenseTransactionService: ExpenseService,
    public creditCardService: CreditCardService,
    private receiptAiService: ReceiptAiService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    super();
    this.expense = this.route.snapshot.data['expense'];
  }

  splitEqually() {
    const totalRaw = this.expenseForm.get('totalValue')?.value;
    if (!totalRaw) return;
    const total = CurrencyUtils.StringToDecimal(totalRaw);
    const count = this.expenseResposiblesArraySignal().length;
    if (count === 0 || total <= 0) return;

    const perPerson = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - perPerson * count) * 100) / 100;

    for (let i = 0; i < count; i++) {
      const val = i === 0 ? perPerson + remainder : perPerson;
      this.expenseResposiblesArraySignal().at(i).get('proratedValue')?.setValue(CurrencyUtils.DecimalToString(val));
    }
  }

  ngOnInit() {
    this.creditCardService.getCreditCards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

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

    const initialTotalValue = CurrencyUtils.DecimalToString(CurrencyUtils.StringToDecimal(this.expense.totalValue));
    const instCount = parseInt(this.expense.installments) || 1;
    const numericTotal = CurrencyUtils.StringToDecimal(initialTotalValue);
    if (instCount > 1) {
      this.fullPurchaseTotal.set(CurrencyUtils.RoundToTwoDecimals(numericTotal * instCount));
    } else {
      this.fullPurchaseTotal.set(numericTotal);
    }

    if (this.expense.receiptImage) {
      this.attachedReceipt.set({
        file: null as any,
        previewUrl: this.expense.receiptImage,
        name: this.expense.receiptName || 'Comprovante anexado'
      });
    }

    this.expenseForm.patchValue({
      expenseOrigin: this.expense.expenseOrigin,
      totalValue: initialTotalValue,
      methodList: (this.expense as any).methodList || this.expense.paymentMethod || '1',
      creditCardList: (this.expense as any).creditCardList || (this.expense.creditCardId ? this.expense.creditCardId.toString() : 'None'),
      installments: instCount.toString(),
      categoryList: this.expense.categoryList || 'Alimentacao',
      date: this.expense.date ? (this.datePipe.transform(this.expense.date, 'yyyy-MM-ddTHH:mm') || this.expense.date) : this.getCurrentDateTime()
    });

    this.expenseForm.get('methodList')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.handleCreditCardListChange(value);
      });

    this.expenseForm.get('totalValue').valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        const inst = parseInt(this.expenseForm.get('installments')?.value) || 1;
        if (inst <= 1) {
          const num = CurrencyUtils.StringToDecimal(value);
          this.fullPurchaseTotal.set(num);
        }
        this.handleProratedValueChange(value);
      });

    this.expenseForm.get('installments')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        const count = parseInt(value) || 1;
        const total = this.fullPurchaseTotal();
        if (total && total > 0 && count >= 1) {
          const installmentVal = CurrencyUtils.RoundToTwoDecimals(total / count);
          const formatted = CurrencyUtils.DecimalToString(installmentVal);
          this.expenseForm.get('totalValue')?.setValue(formatted);
        }
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
  }

  fullPurchaseTotalFormatted(): string {
    return CurrencyUtils.DecimalToString(this.fullPurchaseTotal());
  }

  onReceiptCleared(): void {
    this.attachedReceipt.set(null);
    this.aiDetectedData.set(null);
    this.cdr.detectChanges();
  }

  onReceiptCaptured(data: ReceiptData): void {
    this.attachedReceipt.set(data);
    this.isAiAnalyzing.set(true);
    this.toastr.info('✨ Analisando comprovante com IA...', 'IA Financeira', { easeTime: 200, timeOut: 3000, progressBar: true });

    this.receiptAiService.analyzeReceipt(data.previewUrl, data.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isAiAnalyzing.set(false);
          if (res && res.success && res.data) {
            this.aiDetectedData.set(res.data);
            this.applyAiDataToForm(res.data);
          }
        },
        error: () => {
          this.isAiAnalyzing.set(false);
          this.toastr.warning('Não foi possível extrair automaticamente todos os dados. Preencha os campos acompanhando o comprovante ao lado.', 'Aviso de Análise');
        }
      });
  }

  applyAiDataToForm(data: AiReceiptAnalysisData): void {
    this.isWritableDescription.set(true);

    const origTotal = data.originalTotal || data.totalValue;
    this.fullPurchaseTotal.set(origTotal);

    this.expenseForm.patchValue({
      expenseOrigin: {
        name: data.establishment || this.expenseForm.get('expenseOrigin.name')?.value,
        description: data.description || this.expenseForm.get('expenseOrigin.description')?.value
      },
      categoryList: data.category || this.expenseForm.get('categoryList')?.value,
      date: data.date || this.expenseForm.get('date')?.value,
      methodList: data.paymentMethod || this.expenseForm.get('methodList')?.value,
      totalValue: data.totalValueFormatted || this.expenseForm.get('totalValue')?.value,
      installments: String(data.installments || this.expenseForm.get('installments')?.value || 1)
    });

    if (data.paymentMethod === '1' && data.creditCardLastDigits) {
      const lastDigits = data.creditCardLastDigits;
      if (lastDigits === '4641') this.expenseForm.get('creditCardList')?.setValue('4');
      else if (lastDigits === '4195') this.expenseForm.get('creditCardList')?.setValue('1');
      else if (lastDigits === '1880') this.expenseForm.get('creditCardList')?.setValue('2');
      else if (lastDigits === '2020') this.expenseForm.get('creditCardList')?.setValue('3');
    }

    this.autoSplitProratedEqually(data.totalValueFormatted);
    this.expenseForm.markAsDirty();
    this.cdr.detectChanges();

    this.toastr.success(
      `Dados identificados: ${data.establishment}`,
      '✨ IA Concluída com Sucesso',
      { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true }
    );
  }

  updateExpense() {
    if (this.differenceValueTotalWithProrated() !== 0) {
      this.toastr.error('Valor de rateio dos responsáveis deve ser igual ao valor total do gasto.', 'Edição de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
      return;
    }

    if (!this.expenseForm.valid) {
      this.toastr.warning('Por favor, preencha todos os campos obrigatórios corretamente.', 'Formulário Inválido', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
      return;
    }

    this.expenseTransaction = Object.assign({}, this.expenseTransaction, this.expenseForm.value);

    // Garante sincronização de paymentMethod e creditCardId
    this.expenseTransaction.paymentMethod = this.expenseForm.value.methodList;
    this.expenseTransaction.creditCardId = this.expenseForm.value.creditCardList && this.expenseForm.value.creditCardList !== 'None'
      ? parseInt(this.expenseForm.value.creditCardList) : 0;

    // Vincula recibo atualizado ou existente
    if (this.attachedReceipt()) {
      this.expenseTransaction.receiptImage = this.attachedReceipt()?.previewUrl;
      this.expenseTransaction.receiptName = this.attachedReceipt()?.name;
    } else {
      this.expenseTransaction.receiptImage = undefined;
      this.expenseTransaction.receiptName = undefined;
    }

    const totalValueDecimal = CurrencyUtils.StringToDecimal(this.expenseTransaction.totalValue);
    this.expenseTransaction.totalValue = totalValueDecimal.toString();

    this.expenseTransaction.expenseResponsibles.forEach(element => {
      element.proratedValue = CurrencyUtils.StringToDecimal(element.proratedValue);
      element.responsibleId = parseFloat(element.responsibleId.toString());
    });

    this.expenseTransactionService.updateExpense(this.expense.id.toString(), this.expenseTransaction)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (success) => {
          this.processSuccess(success);
        },
        error: (fail) => {
          this.processFail(fail);
        },
        complete: () => {
          this.changesNotSaved = false;
        }
      });
  }

  processSuccess(response: Expense) {
    this.errors.set([]);
    this.toastr.success('Gasto atualizado com sucesso!', 'Atualização de transação', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });
    this.router.navigate(['/expense/list']);
  }

  processFail(fail: any) {
    this.errors.set([]);
    const errList = fail.error?.errors ? fail.error.errors.map((error: any) => error['msg']) : [fail.error?.error || 'Erro desconhecido'];
    this.errors.set(errList);
    this.toastr.error('Ocorreu um erro!', 'Atualização de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }
}
