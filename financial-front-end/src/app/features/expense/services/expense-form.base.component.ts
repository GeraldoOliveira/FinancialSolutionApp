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

export abstract class ExpenseFormBaseComponent {

    protected toastr = inject(ToastrService);
    protected fb = inject(FormBuilder);
    protected destroyRef = inject(DestroyRef);
    protected datePipe = inject(DatePipe);

    expenseTransaction: Expense;
    expenseOrigin: ExpenseOrigin;
    expenseResposible: ExpenseResponsible;
    expenseForm!: FormGroup;

    validationMessages!: ValidationMessages;
    genericValidator!: GenericValidator;
    displayMessage: DisplayMessage = { name: '', description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsible: '', proratedValue: '', categoryList: '', date: '' };

    MASKS = NgxBrazilMASKS;

    protected changesNotSaved: boolean;
    protected itemSubscriptions: Map<number, Subscription> = new Map();
    protected expenseResposiblesArraySignal: WritableSignal<FormArray> = signal(
        new FormArray<any>([])
    );
    protected isWritableDescription: WritableSignal<boolean> = signal(false);
    protected controlBlurs: Observable<any>[];

    constructor() {
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

            const newProratedRaw: string = value.proratedValue?.toString() || '0';
            const newProratedNumericValue = CurrencyUtils.StringToDecimal(newProratedRaw);
            const maxProratedValue = this.differenceValueTotalWithProrated(index);

            if (newProratedNumericValue > maxProratedValue) {
                const proratedControl = formGroup.get('proratedValue');
                proratedControl.setValue(CurrencyUtils.DecimalToString(maxProratedValue), { emitEvent: false });
            }
        });

        this.itemSubscriptions.set(index, sub);
    }

    protected setupAllSubscriptions(): void {
        this.unsubscribeAllItems();
        this.expenseResposiblesArraySignal().controls.forEach((_, index) => {
            this.subscribeToFormGroup(index);
        });
    }

    protected removeExpenseResponsible(): void {
        const arrayControl = this.expenseResposiblesArraySignal();
        if (arrayControl.length > 1) {
            arrayControl.removeAt(arrayControl.length - 1);
            this.setupAllSubscriptions();
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

    protected handleProratedValueChange(totalValue: string): void {
        const proratedGroup = this.expenseResposiblesArraySignal();
        let totalNumericValue: number = CurrencyUtils.StringToDecimal(totalValue);
        let valuePerPerson = totalNumericValue / proratedGroup.length;
        valuePerPerson = CurrencyUtils.RoundToTwoDecimals(valuePerPerson);

        if (proratedGroup.length > 0) {
            for (let i = 0; i < proratedGroup.length; i++) {
                const proratedChild = proratedGroup.at(i) as FormGroup;

                const proratedControl = proratedChild.get('proratedValue');
                if (totalValue && valuePerPerson > 0) {
                    proratedControl.setValue(CurrencyUtils.DecimalToString(valuePerPerson), { emitEvent: false });
                } else {
                    proratedControl.setValue('0,00', { emitEvent: false });
                }
            }
        }
    }

    protected createExpenseResponsibleGroup(): FormGroup {
        return this.fb.group({
            responsibleId: ['', [Validators.required]],
            proratedValue: [0, [Validators.required]]
        });
    }

    protected addExpenseResponsible(): void {
        if (this.differenceValueTotalWithProrated() > 0) {
            const arrayControl = this.expenseResposiblesArraySignal();
            arrayControl.push(this.createExpenseResponsibleGroup());
            this.setupAllSubscriptions();
            this.completeValueAddExpenseResponsible();
        } else {
            this.toastr.error('Não há valores disponíveis para novos rateios!', 'Adição de responsável', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
        }

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
        const elementsChange$ = merge(
            of(formInputElements),
            formInputElements.changes
        ).pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((list: QueryList<ElementRef>) => {
                this.controlBlurs = list.toArray()
                    .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));
                return merge(...this.controlBlurs);
            })
        );

        elementsChange$.subscribe(() => {
            this.displayMessage = this.genericValidator.processMessages(this.expenseForm);
            this.changesNotSaved = true;
        });

    }

    protected getCurrentDateTime(): string {
        return this.datePipe.transform(new Date(), 'yyyy-MM-ddTHH:mm') || '';
    }
}