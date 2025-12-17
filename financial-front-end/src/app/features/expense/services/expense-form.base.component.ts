import { FormGroup } from "@angular/forms";
import { ExpenseOrigin } from "../../../shared/models/expense-origin";
import { ExpenseResponsible } from "../../../shared/models/expense-responsible";
import { Expense } from "../../../shared/models/expense-transaction";
import { DisplayMessage, GenericValidator, ValidationMessages } from "../../../shared/utils/generic-form-validation";
import { NgxBrazilMASKS } from "ngx-brazil";


export abstract class ExpenseFormBaseComponent {

    expenseTransaction: Expense;
    expenseOrigin: ExpenseOrigin;
    expenseResposible: ExpenseResponsible;
    expenseForm!: FormGroup;

    validationMessages!: ValidationMessages;
    genericValidator!: GenericValidator;
    displayMessage: DisplayMessage = { name: '', description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsible: '', proratedValue: '', categoryList: '', date: '' };

    MASKS = NgxBrazilMASKS;


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

}