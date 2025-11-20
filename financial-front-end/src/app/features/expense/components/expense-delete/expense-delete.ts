import { Component, DestroyRef, Input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { ExpenseService } from '../../services/expense.service';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Expense } from '../../../../shared/models/expense-transaction';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-expense-delete',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './expense-delete.html',
  styleUrl: './expense-delete.css'
})
export class ExpenseDelete {

  @Input() transaction: Expense;
  TOAST_DURATION: number = 1500;

  constructor(public activeModal: NgbActiveModal,
    private expenseTransactionService: ExpenseService,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
  ) {

    this.destroyRef.onDestroy(() => {
      console.log('Componente _expenseTransaction está sendo destruído.');
    });

  }

  confirmDelete() {

    this.expenseTransactionService.deleteExpense(this.transaction.id.toString())
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (success) => {
          this.processSuccess(success)
        },
        error: (fail) => {
          this.processFail(fail)
        },
        complete: () => {
          console.log("OK")
        }
      })
    setTimeout(() => {
      this.activeModal.close(true);
    }, this.TOAST_DURATION);

  }

  processSuccess(response: any) {
    this.toastr.success("Exclusão realizada com sucesso", 'Exclusão de transação', { easeTime: 200, timeOut: this.TOAST_DURATION, progressBar: true, closeButton: true });
  }

  processFail(fail: any) {
    this.toastr.error('Ocorreu um erro!', 'Exclusão de transação', { easeTime: 200, timeOut: this.TOAST_DURATION, progressBar: true, closeButton: true });
  }
}
