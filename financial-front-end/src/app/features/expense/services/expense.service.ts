import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, shareReplay } from "rxjs";

import { BaseService } from "../../../core/services/base.service";
import { Expense } from "../../../shared/models/expense-transaction";

import { ActivatedRouteSnapshot } from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class ExpenseService extends BaseService {

    constructor(private http: HttpClient) { super(); }

    getAllTransactions(): Observable<Expense[]> {
        return this.http
            .get<Expense[]>(this.UrlServiceV1 + 'expenses')
            .pipe(
                catchError(this.ServiceError),
                shareReplay({ bufferSize: 1, refCount: true })
            );
    }

    getById(id: string): Observable<Expense> {
        return this.http
            .get<Expense>(this.UrlServiceV1 + 'expense/' + id)
            .pipe(
                catchError(this.ServiceError),
                shareReplay({ bufferSize: 1, refCount: true })
            );
    }

    registerExpense(expenseTransaction: Expense): Observable<Expense> {
        let response = this.http
            .post(this.UrlServiceV1 + 'expense', expenseTransaction, this.GetAuthHeaderJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }

    updateExpense(id: string, expenseTransaction: Expense): Observable<Expense> {
        let response = this.http
            .put<any>(this.UrlServiceV1 + 'expense/' + id, expenseTransaction, this.GetAuthHeaderJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }

    deleteExpense(id: string): Observable<Expense> {
        let response = this.http
            .delete<any>(this.UrlServiceV1 + 'expense/' + id, this.GetAuthHeaderJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }
}