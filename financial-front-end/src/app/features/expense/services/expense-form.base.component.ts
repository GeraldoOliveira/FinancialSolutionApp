import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ExpenseOrigin } from "../../../shared/models/expense-origin";
import { ExpenseResponsible } from "../../../shared/models/expense-responsible";
import { Expense } from "../../../shared/models/expense-transaction";
import { DisplayMessage, GenericValidator, ValidationMessages } from "../../../shared/utils/generic-form-validation";
import { NgxBrazilMASKS } from "ngx-brazil";
import { DestroyRef, ElementRef, inject, QueryList, signal, WritableSignal } from "@angular/core";
import { fromEvent, merge, Observable, of, Subscription, switchMap } from "rxjs";
import { CurrencyUtils } from '../../../shared/utils/currency-utils';
import { ToastrService } from "ngx-toastr";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { FormBaseComponent } from "../../../base-components/form-base.component";
import { ResponsibleService } from "../../../core/services/responsible.service";

export abstract class ExpenseFormBaseComponent extends FormBaseComponent {

    protected toastr = inject(ToastrService);
    protected fb = inject(FormBuilder);
    protected datePipe = inject(DatePipe);
    public responsibleService = inject(ResponsibleService);

    expenseTransaction: Expense;
    expenseOrigin: ExpenseOrigin;
    expenseResposible: ExpenseResponsible;
    expenseForm!: FormGroup;

    MASKS = NgxBrazilMASKS;

    protected itemSubscriptions: Map<number, Subscription> = new Map();
    public expenseResposiblesArraySignal: WritableSignal<FormArray> = signal(
        new FormArray<any>([])
    );
    protected isWritableDescription: WritableSignal<boolean> = signal(false);

    constructor() {
        super();
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

        super.configureMessageValidationBase(this.validationMessages);
    }

    protected expenseResposiblesArrayItem(): FormArray {
        return this.expenseForm.get('expenseResponsibles') as FormArray;
    }

    protected unsubscribeAllItems(): void {
        this.itemSubscriptions.forEach(sub => sub.unsubscribe());
        this.itemSubscriptions.clear();
    }

    protected subscribeToFormGroup(index: number): void {
        const formGroup = this.expenseResposiblesArraySignal().at(index) as FormGroup;

        const sub = formGroup.valueChanges.subscribe(value => {
            // Apenas monitora alterações para atualizar a validação de diferença total sem bloquear a digitação
            this.changesNotSaved = true;
        });

        this.itemSubscriptions.set(index, sub);
    }

    protected setupAllSubscriptions(): void {
        this.unsubscribeAllItems();
        this.expenseResposiblesArraySignal().controls.forEach((_, index) => {
            this.subscribeToFormGroup(index);
        });
    }

    public removeExpenseResponsible(index?: number): void {
        const arrayControl = this.expenseResposiblesArraySignal();
        if (arrayControl.length > 1) {
            const targetIndex = index !== undefined ? index : arrayControl.length - 1;
            arrayControl.removeAt(targetIndex);
            this.setupAllSubscriptions();
            this.autoSplitProratedEqually();
        } else {
            this.toastr.error('É necessário ao menos um responsável.', 'Remoção de responsável', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
        }
    }

    protected differenceValueTotalWithProrated(index: number = -1): number {
        const arrayControl = this.expenseResposiblesArraySignal();
        let valueTotalCompleted: number = 0;

        const totalValueRaw = this.expenseForm.get('totalValue')?.getRawValue() as string;
        const totalNumericValue = CurrencyUtils.StringToDecimal(totalValueRaw);

        if (arrayControl.length > 0) {
            for (let i = 0; i < arrayControl.length; i++) {
                const proratedChild = arrayControl.at(i) as FormGroup;
                const proratedControl = proratedChild.get('proratedValue');

                if (proratedControl && i != index) {
                    const proratedRaw: string = proratedControl.getRawValue() as string;
                    const proratedNumericValue = CurrencyUtils.StringToDecimal(proratedRaw);
                    valueTotalCompleted += proratedNumericValue;
                }
            }

            let remainingValue = totalNumericValue - valueTotalCompleted;
            const finalValueToSet: number = CurrencyUtils.RoundToTwoDecimals(remainingValue);

            return finalValueToSet;
        } else {
            return 0;
        }
    }

    private getFormChild(childName: string): AbstractControl {
        return this.expenseForm.get(childName);
    }

    protected handleCreditCardListChange(methodList: string): void {
        const creditCardControl = this.getFormChild("creditCardList");
        const installmentsControl = this.getFormChild("installments");

        if (methodList === '1') {
            creditCardControl?.setValidators(Validators.required);
            installmentsControl?.setValidators(Validators.required);
            if (creditCardControl?.value === 'None') {
                creditCardControl?.setValue('');
            }
            if (!installmentsControl?.value) {
                installmentsControl?.setValue('1');
            }
        } else {
            creditCardControl?.clearValidators();
            installmentsControl?.clearValidators();
            creditCardControl?.setValue('None');
            installmentsControl?.setValue('1');
        }
        creditCardControl?.updateValueAndValidity();
        installmentsControl?.updateValueAndValidity();
    }

    public autoSplitProratedEqually(totalValueInput?: string): void {
        const proratedGroup = this.expenseResposiblesArraySignal();
        const totalValue = totalValueInput !== undefined ? totalValueInput : this.expenseForm.get('totalValue')?.value;
        const totalNumericValue: number = CurrencyUtils.StringToDecimal(totalValue);

        if (proratedGroup.length === 0 || totalNumericValue <= 0) return;

        const count = proratedGroup.length;
        const splitAmount = Math.floor((totalNumericValue / count) * 100) / 100;
        const remainder = CurrencyUtils.RoundToTwoDecimals(totalNumericValue - (splitAmount * count));

        for (let i = 0; i < count; i++) {
            const proratedChild = proratedGroup.at(i) as FormGroup;
            const proratedControl = proratedChild.get('proratedValue');
            const currentAmount = i === 0 ? CurrencyUtils.RoundToTwoDecimals(splitAmount + remainder) : splitAmount;
            proratedControl?.setValue(CurrencyUtils.DecimalToString(currentAmount), { emitEvent: false });
        }
    }

    protected handleProratedValueChange(totalValue: string): void {
        this.autoSplitProratedEqually(totalValue);
    }

    protected createExpenseResponsibleGroup(defaultId: number | string = ''): FormGroup {
        return this.fb.group({
            responsibleId: [defaultId, [Validators.required]],
            proratedValue: ['', [Validators.required]]
        });
    }

    public addExpenseResponsible(): void {
        const arrayControl = this.expenseResposiblesArraySignal();
        const selectedIds = arrayControl.controls
            .map(c => Number(c.get('responsibleId')?.value))
            .filter(id => !isNaN(id) && id > 0);
        const allResponsibles = this.responsibleService?.responsiblesSignal() || [];
        const nextAvailable = allResponsibles.find(r => !selectedIds.includes(r.id));
        const defaultId = nextAvailable ? nextAvailable.id : (allResponsibles[0]?.id || '');

        arrayControl.push(this.createExpenseResponsibleGroup(defaultId));
        this.setupAllSubscriptions();
        this.autoSplitProratedEqually();
    }

    protected completeValueAddExpenseResponsible(): void {
        const arrayControl = this.expenseResposiblesArraySignal();
        const lastIndex = arrayControl.length - 1;
        const lastProratedControl = arrayControl.at(lastIndex)?.get('proratedValue');

        if (lastProratedControl) {
            // Passa o índice do último item para excluí-lo do cálculo
            const remainingValue = this.differenceValueTotalWithProrated(lastIndex);
            lastProratedControl.setValue(CurrencyUtils.DecimalToString(remainingValue), { emitEvent: false });
        }
    }

    changeWritableDescription(): void {
        this.isWritableDescription.update(value => !value);
    }

    protected setupControlBlurObservable(formInputElements: QueryList<ElementRef>) {
        super.configureValidationFormBase(formInputElements, this.expenseForm);
    }

    protected getCurrentDateTime(): string {
        return this.datePipe.transform(new Date(), 'yyyy-MM-ddTHH:mm') || '';
    }
}