import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { catchError, map, Observable } from "rxjs";

import { BaseService } from "../../../core/services/base.service";

import { Expense } from "../models/expense-transaction";

import { ExpenseTransaction } from "../expense-transaction";

@Injectable({
    providedIn: ExpenseTransaction
})
export class ExpenseTransactionService extends BaseService {

    constructor(private http: HttpClient) { super(); }

    registerExpense(expenseTransaction: Expense): Observable<Expense> {
        let response = this.http
            .post(this.UrlServiceV1 + 'new-expense', expenseTransaction, this.GetHeadersJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }
}  