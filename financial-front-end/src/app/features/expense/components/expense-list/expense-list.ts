import { Component, Pipe, PipeTransform, signal, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

import { Expense } from '../../../../shared/models/expense-transaction'
import { ExpenseService } from '../../services/expense.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Pipe({
  name: 'responsibleName',
  standalone: true
})
export class ResponsibleNamePipe implements PipeTransform {
  transform(id: number): string {
    switch (id) {
      case 1:
        return 'Anelise';
      case 2:
        return 'Neto';
      case 3:
        return 'Yah';
      default:
        return `ID Desconhecido`;
    }
  }
}

@Component({
  selector: 'app-expense-list',
  imports: [RouterLink, ResponsibleNamePipe, CurrencyPipe, NgxSpinnerModule],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
  providers: []
})
export class ExpenseList {
  public transactionsSignal: Signal<Expense[]>
  public errorMessageSignal = signal('');

  constructor(private expenseTransactionService: ExpenseService,
              private spinner: NgxSpinnerService
              ) {

    this.transactionsSignal = toSignal(
      this.expenseTransactionService.getAllTransactions(),
      { initialValue: [] as Expense[] }
    );
    this.expenseTransactionService.getAllTransactions()
      .subscribe({
        error: error => {
          this.errorMessageSignal.set(error.message || 'Ocorreu um erro ao buscar os dados.');
        }
      });

  }

  ngOnInit() {
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);
  }
}