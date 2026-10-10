import { ExpenseOrigin } from "./expense-origin";
import { ExpenseResponsible } from "./expense-responsible";

export interface Expense {
    id: number;
    expenseOrigin: ExpenseOrigin;
    totalValue: string;
    paymentMethod: string;
    methodList?: string;
    creditCardId: number;
    creditCardList?: string;
    expenseResponsibles: ExpenseResponsible[];
    categoryId?: number;
    categoryList?: string;
    installments: number;
    userId: number;
    invoiceDateId: number;
    date: Date;
    receiptImage?: string;
    receiptName?: string;
}