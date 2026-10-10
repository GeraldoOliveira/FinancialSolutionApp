import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BudgetService } from './services/budget.service';
import { ExpenseService } from '../expense/services/expense.service';
import { Budget } from '../../shared/models/budget';
import { Expense } from '../../shared/models/expense-transaction';
import { CurrencyUtils } from '../../shared/utils/currency-utils';

import { PeriodFilterService } from '../../core/services/period-filter.service';

interface CategoryStyle {
  icon: string;
  color: string;
  bgLight: string;
}

@Component({
  selector: 'app-budget-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './budget-management.html'
})
export class BudgetManagement implements OnInit {
  public budgets = signal<Budget[]>([]);
  public expenses = signal<Expense[]>([]);
  public isLoading = signal<boolean>(false);

  // Filtro de período compartilhado do Header
  public filterByPeriod = signal<boolean>(true);
  public selectedMonthYear = computed(() => this.periodService.selectedMonthYear());
  public formattedMonthName = computed(() => this.periodService.formattedMonthYear());

  // Metas filtradas pelo período selecionado
  public filteredBudgets = computed(() => {
    const list = this.budgets();
    if (!this.filterByPeriod()) return list;
    const sel = this.selectedMonthYear();
    return list.filter(b => !b.monthYear || b.monthYear === sel);
  });

  // Modal
  public isModalOpen = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public currentBudgetId = signal<number | null>(null);

  // Form Fields
  public formCategory = signal<string>('Alimentacao');
  public formMonthlyLimit = signal<number | null>(null);
  public formMonthlyLimitFormatted = signal<string>('');
  public formMonthYear = signal<string>(new Date().toISOString().substring(0, 7));
  public formAlertThreshold = signal<number>(80);

  // Categorias Predefinidas
  public standardCategories: string[] = [
    'Alimentacao',
    'Supermercado',
    'Carro',
    'Viagem',
    'Lazer',
    'Saude',
    'Moradia',
    'Educacao',
    'Compras & Vestuário',
    'Outros'
  ];

  // Mapa de Estilos por Categoria
  private categoryStyles: Record<string, CategoryStyle> = {
    'Alimentacao': { icon: 'fas fa-utensils', color: '#10B981', bgLight: 'rgba(16, 185, 129, 0.15)' },
    'Supermercado': { icon: 'fas fa-shopping-cart', color: '#6366F1', bgLight: 'rgba(99, 102, 241, 0.15)' },
    'Carro': { icon: 'fas fa-gas-pump', color: '#3B82F6', bgLight: 'rgba(59, 130, 246, 0.15)' },
    'Viagem': { icon: 'fas fa-plane-departure', color: '#F59E0B', bgLight: 'rgba(245, 158, 11, 0.15)' },
    'Lazer': { icon: 'fas fa-film', color: '#EC4899', bgLight: 'rgba(236, 72, 153, 0.15)' },
    'Saude': { icon: 'fas fa-heartbeat', color: '#EF4444', bgLight: 'rgba(239, 68, 68, 0.15)' },
    'Moradia': { icon: 'fas fa-home', color: '#8B5CF6', bgLight: 'rgba(139, 92, 246, 0.15)' },
    'Educacao': { icon: 'fas fa-graduation-cap', color: '#06B6D4', bgLight: 'rgba(6, 182, 212, 0.15)' },
    'Compras & Vestuário': { icon: 'fas fa-tshirt', color: '#F97316', bgLight: 'rgba(249, 115, 22, 0.15)' },
    'Outros': { icon: 'fas fa-tag', color: '#64748B', bgLight: 'rgba(100, 116, 139, 0.15)' }
  };

  // Cálculo de gastos reais por categoria a partir de expenses
  public realExpensesByCategory = computed(() => {
    const map = new Map<string, number>();
    const month = this.filterByPeriod() ? this.selectedMonthYear() : null;

    this.expenses().forEach(exp => {
      if (exp.date && month) {
        const dStr = typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString();
        if (!dStr.startsWith(month)) {
          return;
        }
      }
      const cat = exp.categoryList || (exp.expenseOrigin ? exp.expenseOrigin.name : 'Outros');
      const val = CurrencyUtils.StringToDecimal(exp.totalValue) || 0;
      map.set(cat, (map.get(cat) || 0) + val);
    });
    return map;
  });

  // Métricas Consolidadas
  public totalMonthlyLimit = computed(() => {
    return this.filteredBudgets().reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
  });

  public totalCurrentSpent = computed(() => {
    const realSpentMap = this.realExpensesByCategory();
    return this.filteredBudgets().reduce((acc, b) => {
      const realSpent = realSpentMap.get(b.category);
      const spent = realSpent !== undefined ? realSpent : (b.currentSpent || 0);
      return acc + spent;
    }, 0);
  });

  public totalRemaining = computed(() => {
    return this.totalMonthlyLimit() - this.totalCurrentSpent();
  });

  public overallPercentage = computed(() => {
    const limit = this.totalMonthlyLimit();
    if (limit === 0) return 0;
    return Math.round((this.totalCurrentSpent() / limit) * 100);
  });

  public exceededCount = computed(() => {
    const realSpentMap = this.realExpensesByCategory();
    return this.filteredBudgets().filter(b => {
      const spent = realSpentMap.get(b.category) ?? (b.currentSpent || 0);
      return spent > b.monthlyLimit;
    }).length;
  });

  public warningCount = computed(() => {
    const realSpentMap = this.realExpensesByCategory();
    return this.filteredBudgets().filter(b => {
      const spent = realSpentMap.get(b.category) ?? (b.currentSpent || 0);
      const threshold = (b.alertThresholdPercent || 80) / 100;
      return spent >= b.monthlyLimit * threshold && spent <= b.monthlyLimit;
    }).length;
  });

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    public periodService: PeriodFilterService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.budgetService.getBudgets().subscribe({
      next: (list) => {
        this.budgets.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastr.error('Erro ao carregar orçamentos.', 'Erro');
        this.isLoading.set(false);
      }
    });

    this.expenseService.getAllTransactions().subscribe({
      next: (expList) => this.expenses.set(expList),
      error: () => {}
    });
  }

  getSpentForBudget(budget: Budget): number {
    const realSpent = this.realExpensesByCategory().get(budget.category);
    return realSpent !== undefined ? realSpent : (budget.currentSpent || 0);
  }

  getBudgetPercentage(budget: Budget): number {
    if (!budget.monthlyLimit || budget.monthlyLimit === 0) return 0;
    const spent = this.getSpentForBudget(budget);
    return Math.round((spent / budget.monthlyLimit) * 100);
  }

  getBudgetRemaining(budget: Budget): number {
    const spent = this.getSpentForBudget(budget);
    return budget.monthlyLimit - spent;
  }

  getCategoryStyle(category: string): CategoryStyle {
    return this.categoryStyles[category] || {
      icon: 'fas fa-tag',
      color: '#6366F1',
      bgLight: 'rgba(99, 102, 241, 0.15)'
    };
  }

  onLimitInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    if (!raw) {
      this.formMonthlyLimit.set(null);
      this.formMonthlyLimitFormatted.set('');
      return;
    }
    const numeric = parseFloat(raw) / 100;
    this.formMonthlyLimit.set(numeric);
    this.formMonthlyLimitFormatted.set(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  openNewBudgetModal(): void {
    this.isEditing.set(false);
    this.currentBudgetId.set(null);
    this.formCategory.set('Alimentacao');
    this.formMonthlyLimit.set(null);
    this.formMonthlyLimitFormatted.set('');
    this.formMonthYear.set(this.selectedMonthYear());
    this.formAlertThreshold.set(80);
    this.isModalOpen.set(true);
  }

  openEditBudgetModal(budget: Budget): void {
    this.isEditing.set(true);
    this.currentBudgetId.set(budget.id || null);
    this.formCategory.set(budget.category);
    this.formMonthlyLimit.set(budget.monthlyLimit);
    this.formMonthlyLimitFormatted.set(
      budget.monthlyLimit ? budget.monthlyLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    );
    this.formMonthYear.set(budget.monthYear || this.selectedMonthYear());
    this.formAlertThreshold.set(budget.alertThresholdPercent || 80);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveBudget(): void {
    const cat = this.formCategory();
    const limit = this.formMonthlyLimit();

    if (!cat) {
      this.toastr.warning('Por favor, selecione uma categoria.', 'Atenção');
      return;
    }

    if (!limit || limit <= 0) {
      this.toastr.warning('Por favor, informe um limite mensal válido maior que zero.', 'Atenção');
      return;
    }

    const payload: Budget = {
      category: cat,
      monthlyLimit: Number(limit),
      currentSpent: this.realExpensesByCategory().get(cat) || 0,
      monthYear: this.formMonthYear(),
      alertThresholdPercent: Number(this.formAlertThreshold())
    };

    if (this.isEditing() && this.currentBudgetId()) {
      this.budgetService.updateBudget(this.currentBudgetId()!, payload).subscribe({
        next: () => {
          this.toastr.success(`Meta para ${cat} atualizada com sucesso!`, 'Sucesso');
          this.closeModal();
          this.loadData();
        },
        error: () => this.toastr.error('Erro ao atualizar orçamento.', 'Erro')
      });
    } else {
      this.budgetService.addBudget(payload).subscribe({
        next: () => {
          this.toastr.success(`Meta para ${cat} criada com sucesso!`, 'Sucesso');
          this.closeModal();
          this.loadData();
        },
        error: () => this.toastr.error('Erro ao criar orçamento.', 'Erro')
      });
    }
  }

  adjustLimit(budget: Budget, delta: number): void {
    if (!budget.id) return;
    const newLimit = Math.max(100, budget.monthlyLimit + delta);
    this.budgetService.updateBudget(budget.id, { monthlyLimit: newLimit }).subscribe({
      next: () => {
        this.toastr.info(`Limite de ${budget.category} ajustado para R$ ${newLimit}`, 'Orçamento Atualizado');
        this.loadData();
      },
      error: () => this.toastr.error('Erro ao ajustar limite.', 'Erro')
    });
  }

  deleteBudget(budget: Budget): void {
    if (!budget.id) return;
    if (confirm(`Deseja remover a meta da categoria "${budget.category}"?`)) {
      this.budgetService.deleteBudget(budget.id).subscribe({
        next: () => {
          this.toastr.success('Meta removida com sucesso!', 'Excluído');
          this.loadData();
        },
        error: () => this.toastr.error('Erro ao excluir orçamento.', 'Erro')
      });
    }
  }
}
