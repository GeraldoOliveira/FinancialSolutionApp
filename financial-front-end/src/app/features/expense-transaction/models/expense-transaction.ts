import { ExpenseOrigin } from "./expense-origin";
import { ExpenseResponsible } from "./expense-responsible";

export interface Expense {
    id: number;
    expenseOrigin: ExpenseOrigin;
    totalValue: number;
    paymentMethod: string;
    creditCardId: number;
    expenseResponsible: ExpenseResponsible;
    categoryId: number;
    installments: number;
    userId: number;
    invoiceDateId: number;
    date: Date;
}