import { ExpenseOrigin } from "./expense-origin";
import { ExpenseResponsible } from "./expense-responsible";

export interface Expense {
    id: number;
    expenseOrigin: ExpenseOrigin;
    totalValue: string;
    paymentMethod: string;
    creditCardId: number;
    expenseResponsibles: ExpenseResponsible[];
    categoryId: number;
    installments: number;
    userId: number;
    invoiceDateId: number;
    date: Date;
}