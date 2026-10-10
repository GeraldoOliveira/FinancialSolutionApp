import { Component, DestroyRef, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../../../shared/models/expense-transaction';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-expense-delete',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './expense-delete.html',
  styleUrl: './expense-delete.css'
})
export class ExpenseDelete {
  @Input() transaction!: Expense;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isDeleting = false;
  TOAST_DURATION = 1500;

  constructor(
    private expenseTransactionService: ExpenseService,
    private destroyRef: DestroyRef,
    private toastr: ToastrService
  ) {}

  confirmDelete(): void {
    if (this.isDeleting) return;
    this.isDeleting = true;

    this.expenseTransactionService.deleteExpense(this.transaction.id.toString())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (success) => {
          this.processSuccess(success);
          setTimeout(() => {
            this.confirmed.emit();
          }, this.TOAST_DURATION);
        },
        error: (fail) => {
          this.isDeleting = false;
          this.processFail(fail);
        }
      });
  }

  cancel(): void {
    if (this.isDeleting) return;
    this.cancelled.emit();
  }

  processSuccess(response: any): void {
    this.toastr.success('Exclusão realizada com sucesso', 'Exclusão de transação', {
      easeTime: 200,
      timeOut: this.TOAST_DURATION,
      progressBar: true,
      closeButton: true
    });
  }

  processFail(fail: any): void {
    this.toastr.error('Ocorreu um erro ao excluir!', 'Exclusão de transação', {
      easeTime: 200,
      timeOut: this.TOAST_DURATION,
      progressBar: true,
      closeButton: true
    });
  }
}
