import { Component, Pipe, PipeTransform, signal, Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

import { Expense } from '../../../../shared/models/expense-transaction'
import { ExpenseService } from '../../services/expense.service';
import { ExpenseDelete } from '../expense-delete/expense-delete';

import { toSignal } from '@angular/core/rxjs-interop';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
    private spinner: NgxSpinnerService,
    private modalService: NgbModal,
    private router: Router,
  ) {

    this.spinner.show();

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
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);
  }

  openDeleteModal(transaction: Expense): void {
    const modalRef = this.modalService.open(ExpenseDelete);

    modalRef.componentInstance.transaction = transaction;

    modalRef.result.then((result) => {
      if (result === true) {
        this.router.navigateByUrl('/', { skipLocationChange: true })
          .then(() => {
            this.router.navigate(['/expense/list']);
          });
      }
    }, (reason) => {
      console.log(`Exclusão do item ${transaction.id} cancelada.`, reason);
    }
    );
  }
}