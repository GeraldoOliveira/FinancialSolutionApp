import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Expense } from '../../../shared/models/expense-transaction';
import { ExpenseService } from '../services/expense.service';

@Injectable({
    providedIn: 'root'
})
export class ExpenseResolve implements Resolve<Expense> {

    constructor(private expenseService: ExpenseService) { }

    resolve(route: ActivatedRouteSnapshot) {
        console.log(this.expenseService.getById(route.params['id']))
        return this.expenseService.getById(route.params['id']);
    }
}