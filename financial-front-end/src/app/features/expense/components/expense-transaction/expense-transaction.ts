import { Component, ElementRef, ViewChild, ViewChildren, signal, WritableSignal, QueryList, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormControlName, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExpenseService } from '../../services/expense.service';
import { MaskedInputDirective } from 'ngx-brazil';
import { CurrencyUtils } from '../../../../shared/utils/currency-utils';
import { ExpenseFormBaseComponent } from '../../services/expense-form.base.component';
import { Expense } from '../../../../shared/models/expense-transaction';

import { ReceiptUploaderComponent, ReceiptData } from '../receipt-uploader/receipt-uploader';
import { WhatsappService } from '../../../../core/services/whatsapp.service';
import { ResponsibleService } from '../../../../core/services/responsible.service';
import { ReceiptAiService, AiReceiptAnalysisData } from '../../../../core/services/receipt-ai.service';
import { CreditCardService } from '../../../cards/services/credit-card.service';

@Component({
  selector: 'app-expense-transaction',
  imports: [CommonModule, ReactiveFormsModule, MaskedInputDirective, ReceiptUploaderComponent],
  templateUrl: './expense-transaction.html',
  styleUrl: './expense-transaction.css',
  providers: [DatePipe]
})
export class ExpenseTransaction extends ExpenseFormBaseComponent {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;
  @ViewChild(ReceiptUploaderComponent) receiptUploader?: ReceiptUploaderComponent;

  errors: WritableSignal<any[]> = signal([]);
  lastRegisteredExpense: WritableSignal<Expense | null> = signal(null);
  attachedReceipt: WritableSignal<ReceiptData | null> = signal(null);
  isAiAnalyzing: WritableSignal<boolean> = signal(false);
  aiDetectedData: WritableSignal<AiReceiptAnalysisData | null> = signal(null);
  fullPurchaseTotal: WritableSignal<number | null> = signal(null);

  constructor(
    private expenseTransactionService: ExpenseService,
    private whatsappService: WhatsappService,
    public creditCardService: CreditCardService,
    private receiptAiService: ReceiptAiService,
    private cdr: ChangeDetectorRef
  ) {
    super();
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
      .subscribe(cards => {
        if (cards && cards.length > 0 && !this.expenseForm.get('creditCardList')?.value) {
          this.expenseForm.get('creditCardList')?.setValue(cards[0].id);
        }
      });

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
      categoryList: ['Alimentacao', [Validators.required]],
      date: ['', [Validators.required]],
    });

    this.expenseForm.patchValue({
      creditCardList: null,
      installments: '1',
      methodList: '1',
      categoryList: 'Alimentacao',
      date: this.getCurrentDateTime()
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

    const responsibles = this.responsibleService.responsiblesSignal();
    const defaultRespId = responsibles.length > 0 ? responsibles[0].id : 2;
    if (initialFormArray.length > 0 && !initialFormArray.at(0).get('responsibleId')?.value) {
      initialFormArray.at(0).get('responsibleId')?.setValue(defaultRespId);
    }

  }

  ngAfterViewInit(): void {
    super.setupControlBlurObservable(this.formInputElements);
  }

  registerExpense() {
    if (this.differenceValueTotalWithProrated() !== 0) {
      this.toastr.error('Valor de rateio dos responsáveis deve ser igual ao valor total do gasto.', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
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

    // Anexa o comprovante aos metadados da transação
    if (this.attachedReceipt()) {
      this.expenseTransaction.receiptImage = this.attachedReceipt()?.previewUrl;
      this.expenseTransaction.receiptName = this.attachedReceipt()?.name;
    }

    // Converte o valor total para decimal e depois para string
    const totalValueDecimal = CurrencyUtils.StringToDecimal(this.expenseTransaction.totalValue);
    this.expenseTransaction.totalValue = totalValueDecimal.toString();

    this.expenseTransaction.expenseResponsibles.forEach(element => {
      // Converte valores de rateio de string formatada para number
      element.proratedValue = CurrencyUtils.StringToDecimal(element.proratedValue);
      element.responsibleId = parseFloat(element.responsibleId.toString());
    });

    this.expenseTransactionService.registerExpense(this.expenseTransaction)
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
          console.log(this.expenseTransaction);
          this.changesNotSaved = false;
        }
      });
  }

  processSuccess(response: Expense) {
    this.lastRegisteredExpense.set({ ...this.expenseTransaction });
    this.attachedReceipt.set(null);
    this.aiDetectedData.set(null);
    this.fullPurchaseTotal.set(null);

    // Limpa a imagem do comprovante e restaura a dropzone inicial
    this.receiptUploader?.clearReceipt();

    const arrayControl = this.expenseResposiblesArraySignal();
    arrayControl.clear();
    const responsibles = this.responsibleService.responsiblesSignal();
    const defaultRespId = responsibles.length > 0 ? responsibles[0].id : 2;
    arrayControl.push(this.createExpenseResponsibleGroup(defaultRespId));

    this.expenseForm.setControl('expenseResponsibles', arrayControl);

    this.setupAllSubscriptions();

    const firstCardId = this.creditCardService.cardsSignal()[0]?.id || null;
    this.expenseForm.reset({
      creditCardList: firstCardId,
      installments: '1',
      methodList: '1',
      categoryList: 'Alimentacao',
      totalValue: '',
      date: this.getCurrentDateTime()
    });

    this.errors.set([]);
    this.toastr.success('Gasto registrado com sucesso!', 'Lançamento de transação', { easeTime: 200, timeOut: 2500, progressBar: true, closeButton: true });
    this.cdr.detectChanges();
  }

  onReceiptCleared(): void {
    this.attachedReceipt.set(null);
    this.aiDetectedData.set(null);
    this.fullPurchaseTotal.set(null);
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
        error: (err) => {
          this.isAiAnalyzing.set(false);
          this.toastr.warning('Não foi possível extrair automaticamente todos os dados. Preencha os campos acompanhando o comprovante ao lado.', 'Aviso de Análise');
        }
      });
  }

  applyAiDataToForm(data: AiReceiptAnalysisData): void {
    // 1. Garante que os campos de texto estão no modo livre para preenchimento
    this.isWritableDescription.set(true);

    // Guarda o valor total integral da compra
    const origTotal = data.originalTotal || data.totalValue;
    this.fullPurchaseTotal.set(origTotal);

    // 2. Preenche todos os campos principais com patchValue (totalValue = valor da parcela)
    this.expenseForm.patchValue({
      expenseOrigin: {
        name: data.establishment || '',
        description: data.description || ''
      },
      categoryList: data.category || 'Alimentacao',
      date: data.date || this.getCurrentDateTime(),
      methodList: data.paymentMethod || '1',
      totalValue: data.totalValueFormatted || '0,00',
      installments: String(data.installments || 1)
    });

    // 3. Se for Cartão de Crédito, seleciona o cartão correspondente pelos últimos dígitos
    if (data.paymentMethod === '1') {
      const lastDigits = data.creditCardLastDigits;
      if (lastDigits === '4641') {
        this.expenseForm.get('creditCardList')?.setValue('4');
      } else if (lastDigits === '4195') {
        this.expenseForm.get('creditCardList')?.setValue('1');
      } else if (lastDigits === '1880') {
        this.expenseForm.get('creditCardList')?.setValue('2');
      } else if (lastDigits === '2020') {
        this.expenseForm.get('creditCardList')?.setValue('3');
      } else {
        this.expenseForm.get('creditCardList')?.setValue('1');
      }
    }

    // 4. Divisão Automática de Rateio Igualitário
    this.autoSplitProratedEqually(data.totalValueFormatted);

    // 5. Marca o formulário como alterado e força detecção de mudanças
    this.expenseForm.markAsDirty();
    this.cdr.detectChanges();

    const infoInstallment = (data.installments && data.installments > 1 && data.originalTotalFormatted)
      ? ` (${data.installments}x de R$ ${data.totalValueFormatted} | Total: R$ ${data.originalTotalFormatted})`
      : ` - R$ ${data.totalValueFormatted}`;

    this.toastr.success(
      `Dados identificados: ${data.establishment}${infoInstallment} (${data.paymentMethodName})`,
      '✨ IA Concluída com Sucesso',
      { easeTime: 200, timeOut: 5000, progressBar: true, closeButton: true }
    );
  }

  fullPurchaseTotalFormatted(): string {
    return CurrencyUtils.DecimalToString(this.fullPurchaseTotal());
  }

  sendWhatsAppNotification(responsibleId: number, proratedValue: number): void {
    const expense = this.lastRegisteredExpense();
    if (!expense) return;

    const responsible = this.responsibleService.getResponsibleById(responsibleId);
    const recipientName = responsible ? responsible.name : `Responsável #${responsibleId}`;
    const recipientPhone = responsible?.phone || '5511999999999';

    const establishment = `${expense.expenseOrigin.name} - ${expense.expenseOrigin.description}`;
    const totalVal = parseFloat(expense.totalValue) || 0;

    const message = this.whatsappService.generateExpenseMessage({
      recipientName,
      recipientPhone,
      establishment,
      totalAmount: totalVal,
      proratedAmount: proratedValue,
      paymentMethod: (expense.paymentMethod || 'Cartão de Crédito'),
      date: expense.date ? (this.datePipe.transform(expense.date, 'dd/MM/yyyy HH:mm') || expense.date.toString()) : (this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') || ''),
      receiptNotes: this.attachedReceipt() ? `Recibo anexado: ${this.attachedReceipt()?.name}` : undefined
    });

    this.whatsappService.openWhatsApp(recipientPhone, message);
  }

  dismissSuccessModal(): void {
    this.lastRegisteredExpense.set(null);
  }

  processFail(fail: any) {
    this.errors.set([]);
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Lançamento de transação', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
