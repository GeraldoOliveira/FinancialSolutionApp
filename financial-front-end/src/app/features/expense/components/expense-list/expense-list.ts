import { Component, Pipe, PipeTransform, signal, Signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseDelete } from '../expense-delete/expense-delete';

import { toSignal } from '@angular/core/rxjs-interop';
import { of, tap, catchError } from 'rxjs';

import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ClaimsUtils } from '../../../../shared/utils/claims-utils';
import { CurrencyUtils } from '../../../../shared/utils/currency-utils';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { PeriodFilterService } from '../../../../core/services/period-filter.service';

@Pipe({
  name: 'responsibleName',
  standalone: true,
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
  imports: [
    ExpenseDelete,CommonModule, RouterLink, ResponsibleNamePipe, CurrencyPipe, DatePipe, NgxSpinnerModule, FormsModule],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
  providers: [],
})
export class ExpenseList {
  public transactionsSignal: Signal<Expense[]>;
  public errorMessageSignal = signal('');

  public searchTerm = signal('');
  public selectedCategory = signal('');
  public filterByPeriod = signal<boolean>(true);

  public filteredTransactions = computed(() => {
    const list = this.transactionsSignal() || [];
    const term = this.searchTerm().trim().toLowerCase();
    const cat = this.selectedCategory();
    const selMonth = this.periodService.selectedMonthYear();
    const applyPeriod = this.filterByPeriod();

    return list.filter(item => {
      let matchesPeriod = true;
      if (applyPeriod && selMonth) {
        const dStr = !item.date ? '' : typeof item.date === 'string' ? item.date : new Date(item.date).toISOString();
        matchesPeriod = dStr.startsWith(selMonth);
      }

      const matchesSearch = !term || 
        (item.expenseOrigin?.name?.toLowerCase().includes(term)) ||
        (item.expenseOrigin?.description?.toLowerCase().includes(term)) ||
        (item.id?.toString().includes(term));

      const matchesCategory = !cat || item.categoryList === cat;

      return matchesPeriod && matchesSearch && matchesCategory;
    });
  });

  public totalFilteredValue = computed(() => {
    return this.filteredTransactions().reduce((acc, curr) => acc + (CurrencyUtils.StringToDecimal(curr.totalValue) || 0), 0);
  });

  claimsUtils = new ClaimsUtils();

  get canDelete(): boolean {
    return this.workspaceService.isAdmin() && this.claimsUtils.checkExpenseClain('Delete');
  }

  get canEdit(): boolean {
    return this.workspaceService.isAdmin() && this.claimsUtils.checkExpenseClain('Edit');
  }

  constructor(
    private expenseTransactionService: ExpenseService,
    private spinner: NgxSpinnerService,
    public workspaceService: WorkspaceService,
    public periodService: PeriodFilterService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.spinner.show();

    const transactions$ = this.expenseTransactionService.getAllTransactions().pipe(
      tap(() => this.spinner.hide()),
      catchError((error) => {
        this.spinner.hide();
        this.errorMessageSignal.set(
          error.message || 'Ocorreu um erro ao buscar os dados.',
        );
        return of([] as Expense[]);
      })
    );

    this.transactionsSignal = toSignal(transactions$, { initialValue: [] as Expense[] });
  }

  ngOnInit() {
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);
  }

  isDeleteModalOpen = signal<boolean>(false);
  transactionToDelete = signal<Expense | null>(null);

  openDeleteModal(transaction: Expense): void {
    if (!this.canDelete) {
      this.toastr.error(
        'Você não tem permissão para excluir despesas.',
        'Acesso Negado',
      );
      return;
    }
    this.transactionToDelete.set(transaction);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.transactionToDelete.set(null);
    this.isDeleteModalOpen.set(false);
  }

  onDeleteConfirmed(): void {
    this.cancelDelete();
    this.router
      .navigateByUrl('/', { skipLocationChange: true })
      .then(() => {
        this.router.navigate(['/expense/list']);
      });
  }

  navigateToEdit(id: number): void {
    if (this.canEdit) {
      this.router.navigate(['/expense/edit', id]);
    }
  }
}
