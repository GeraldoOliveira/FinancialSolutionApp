import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  effect
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Chart, registerables } from 'chart.js';
import { ExpenseService } from '../expense/services/expense.service';
import { IncomeService } from '../income/services/income.service';
import { BudgetService } from '../budgets/services/budget.service';
import { CreditCardService } from '../cards/services/credit-card.service';
import { ResponsibleService } from '../../core/services/responsible.service';
import { PeriodFilterService } from '../../core/services/period-filter.service';
import { Expense } from '../../shared/models/expense-transaction';
import { Income } from '../../shared/models/income';
import { Budget } from '../../shared/models/budget';
import { CreditCard, CreditCardInvoice } from '../../shared/models/credit-card';
import { CurrencyUtils } from '../../shared/utils/currency-utils';
import { LocalStorageUtils } from '../../shared/utils/local-storage';

Chart.register(...registerables);

interface CategoryMetric {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

interface MemberMetric {
  id: number;
  name: string;
  total: number;
  percentage: number;
  color: string;
}

export interface MonthlyHistoryPoint {
  monthYear: string;
  label: string;
  expenses: number;
  incomes: number;
  net: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('donutCanvas') donutCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('flowCanvas') flowCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('historyCanvas') historyCanvas?: ElementRef<HTMLCanvasElement>;

  private donutChart?: Chart;
  private flowChart?: Chart;
  private historyChart?: Chart;

  public allExpenses = signal<Expense[]>([]);
  public allIncomes = signal<Income[]>([]);
  public budgets = signal<Budget[]>([]);
  public invoices = signal<CreditCardInvoice[]>([]);
  public creditCards = signal<CreditCard[]>([]);

  public localStorageUtils = new LocalStorageUtils();

  // Toggle do Gráfico Donut: 'CATEGORY' | 'MEMBER'
  public donutViewMode = signal<'CATEGORY' | 'MEMBER'>('CATEGORY');

  // Modal de Nova Receita
  public isIncomeModalOpen = signal(false);
  public newIncomeDescription = signal('');
  public newIncomeSource = signal('Salário');
  public newIncomeAmount = signal<number | null>(null);
  public newIncomeAmountFormatted = signal('');
  public newIncomeDate = signal(new Date().toISOString().substring(0, 10));
  public newIncomeRecipientId = signal(1);

  // Filtragem reativa pelo período selecionado no header
  public filteredExpenses = computed(() => {
    const list = this.allExpenses();
    const sel = this.periodService.selectedMonthYear();
    return list.filter(exp => {
      if (!exp.date) return false;
      const dStr = typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString();
      return dStr.startsWith(sel);
    });
  });

  public filteredIncomes = computed(() => {
    const list = this.allIncomes();
    const sel = this.periodService.selectedMonthYear();
    return list.filter(inc => {
      if (!inc.date) return false;
      const dStr = typeof inc.date === 'string' ? inc.date : new Date(inc.date).toISOString();
      return dStr.startsWith(sel);
    });
  });

  // Métricas Computadas
  public totalExpenses = computed(() => {
    return this.filteredExpenses().reduce(
      (acc, curr) => acc + (CurrencyUtils.StringToDecimal(curr.totalValue) || 0),
      0
    );
  });

  public totalIncomes = computed(() => {
    return this.filteredIncomes().reduce((acc, curr) => acc + (curr.amount || 0), 0);
  });

  // Minha Parte no Rateio (Calculada para o usuário logado)
  public myProratedShare = computed(() => {
    const user = this.localStorageUtils.getUser();
    // Default id 2 (Neto) se não autenticado
    const myId = user?.id || 2;
    return this.filteredExpenses().reduce((sum, exp) => {
      if (exp.expenseResponsibles && exp.expenseResponsibles.length) {
        const myResp = exp.expenseResponsibles.find(r => r.responsibleId === myId);
        if (myResp) {
          return sum + (CurrencyUtils.StringToDecimal(myResp.proratedValue) || 0);
        }
      }
      return sum;
    }, 0);
  });

  public netBalance = computed(() => {
    return this.totalIncomes() - this.totalExpenses();
  });

  public individualNetBalance = computed(() => {
    return this.totalIncomes() - this.myProratedShare();
  });

  public savingsRate = computed(() => {
    const incomes = this.totalIncomes();
    if (incomes <= 0) return 0;
    const balance = this.netBalance();
    return Math.round((balance / incomes) * 100);
  });

  public recentExpenses = computed(() => {
    return this.filteredExpenses().slice(0, 8);
  });

  // Histórico Mensal (Últimos 6 Meses)
  public monthlyHistory = computed<MonthlyHistoryPoint[]>(() => {
    const now = this.periodService.selectedDate();
    const points: MonthlyHistoryPoint[] = [];
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthYear = `${y}-${m}`;
      const label = `${monthsNames[d.getMonth()]}/${String(y).substring(2)}`;

      const mExpenses = this.allExpenses().filter(e => {
        if (!e.date) return false;
        const s = typeof e.date === 'string' ? e.date : new Date(e.date).toISOString();
        return s.startsWith(monthYear);
      }).reduce((sum, e) => sum + (CurrencyUtils.StringToDecimal(e.totalValue) || 0), 0);

      const mIncomes = this.allIncomes().filter(inc => {
        if (!inc.date) return false;
        const s = typeof inc.date === 'string' ? inc.date : new Date(inc.date).toISOString();
        return s.startsWith(monthYear);
      }).reduce((sum, inc) => sum + (inc.amount || 0), 0);

      points.push({
        monthYear,
        label,
        expenses: mExpenses,
        incomes: mIncomes,
        net: mIncomes - mExpenses
      });
    }

    return points;
  });

  // Próximas Faturas de Cartão
  public upcomingInvoices = computed(() => {
    return this.invoices();
  });

  public categoryMetrics = computed<CategoryMetric[]>(() => {
    const map = new Map<string, number>();
    const colors: Record<string, string> = {
      'Alimentacao': '#10B981',
      'Supermercado': '#6366F1',
      'Carro': '#3B82F6',
      'Viagem': '#F59E0B',
      'Lazer': '#EC4899',
      'Saude': '#EF4444',
      'Moradia': '#8B5CF6'
    };

    this.filteredExpenses().forEach(exp => {
      const cat = exp.categoryList || (exp.expenseOrigin ? exp.expenseOrigin.name : 'Outros');
      const val = CurrencyUtils.StringToDecimal(exp.totalValue) || 0;
      map.set(cat, (map.get(cat) || 0) + val);
    });

    const total = this.totalExpenses() || 1;
    const metrics: CategoryMetric[] = [];

    map.forEach((value, key) => {
      metrics.push({
        name: key,
        total: value,
        percentage: Math.round((value / total) * 100),
        color: colors[key] || '#06B6D4'
      });
    });

    return metrics.sort((a, b) => b.total - a.total);
  });

  public memberMetrics = computed<MemberMetric[]>(() => {
    const map = new Map<number, number>();
    this.filteredExpenses().forEach(exp => {
      if (exp.expenseResponsibles && exp.expenseResponsibles.length) {
        exp.expenseResponsibles.forEach(resp => {
          const val = CurrencyUtils.StringToDecimal(resp.proratedValue) || 0;
          map.set(resp.responsibleId, (map.get(resp.responsibleId) || 0) + val);
        });
      }
    });

    const total = this.totalExpenses() || 1;
    const list: MemberMetric[] = [];

    map.forEach((totalVal, respId) => {
      const resp = this.responsibleService.getResponsibleById(respId);
      list.push({
        id: respId,
        name: resp?.name || `Membro #${respId}`,
        total: totalVal,
        color: resp?.color || '#3B82F6',
        percentage: Math.round((totalVal / total) * 100)
      });
    });

    return list.sort((a, b) => b.total - a.total);
  });

  constructor(
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private budgetService: BudgetService,
    private cardService: CreditCardService,
    public responsibleService: ResponsibleService,
    public periodService: PeriodFilterService,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {
    // Efeito para re-renderizar gráficos quando os dados mudarem
    effect(() => {
      this.categoryMetrics();
      this.memberMetrics();
      this.totalIncomes();
      this.totalExpenses();
      this.donutViewMode();
      this.monthlyHistory();

      if (this.donutCanvas && this.flowCanvas) {
        setTimeout(() => {
          this.renderDonutChart();
          this.renderFlowChart();
          this.renderHistoryChart();
        }, 60);
      }
    });
  }

  ngOnInit(): void {
    this.expenseService.getAllTransactions().subscribe(res => {
      this.allExpenses.set(res);
    });

    this.incomeService.getIncomes().subscribe(res => {
      this.allIncomes.set(res);
    });

    this.budgetService.getBudgets().subscribe(res => {
      this.budgets.set(res);
    });

    this.cardService.getCreditCards().subscribe(res => {
      this.creditCards.set(res);
    });

    this.cardService.getInvoices().subscribe(res => {
      this.invoices.set(res);
    });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new-income') {
        this.openIncomeModal();
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderDonutChart();
      this.renderFlowChart();
      this.renderHistoryChart();
    }, 120);
  }

  ngOnDestroy(): void {
    if (this.donutChart) this.donutChart.destroy();
    if (this.flowChart) this.flowChart.destroy();
    if (this.historyChart) this.historyChart.destroy();
  }

  setDonutMode(mode: 'CATEGORY' | 'MEMBER'): void {
    this.donutViewMode.set(mode);
  }

  getDaysUntilDue(dueDateStr: string): number {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getCardForInvoice(cardId: number): CreditCard | undefined {
    return this.creditCards().find(c => c.id === cardId);
  }

  private renderDonutChart(): void {
    if (!this.donutCanvas?.nativeElement) return;
    if (this.donutChart) this.donutChart.destroy();

    const isMember = this.donutViewMode() === 'MEMBER';
    const labels = isMember
      ? this.memberMetrics().map(m => m.name)
      : this.categoryMetrics().map(c => c.name);

    const data = isMember
      ? this.memberMetrics().map(m => m.total)
      : this.categoryMetrics().map(c => c.total);

    const colors = isMember
      ? this.memberMetrics().map(m => m.color)
      : this.categoryMetrics().map(c => c.color);

    const ctx = this.donutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Sem dados'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors.length ? colors : ['#334155'],
          borderWidth: 3,
          borderColor: '#1E293B',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#FFFFFF',
            bodyColor: '#E2E8F0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (item) => {
                const val = Number(item.raw) || 0;
                return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  }

  private renderFlowChart(): void {
    if (!this.flowCanvas?.nativeElement) return;
    if (this.flowChart) this.flowChart.destroy();

    const ctx = this.flowCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const incomes = this.totalIncomes();
    const expenses = this.totalExpenses();
    const balance = this.netBalance();

    this.flowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Receitas', 'Despesas', 'Saldo'],
        datasets: [{
          data: [incomes, expenses, balance],
          backgroundColor: [
            'rgba(16, 185, 129, 0.85)',
            'rgba(244, 63, 94, 0.85)',
            balance >= 0 ? 'rgba(99, 102, 241, 0.85)' : 'rgba(239, 68, 68, 0.85)'
          ],
          borderColor: [
            '#10B981',
            '#F43F5E',
            balance >= 0 ? '#6366F1' : '#EF4444'
          ],
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#FFFFFF',
            bodyColor: '#E2E8F0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (item) => {
                const val = Number(item.raw) || 0;
                return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#CBD5E1',
              font: { weight: 'bold', size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11 },
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  private renderHistoryChart(): void {
    if (!this.historyCanvas?.nativeElement) return;
    if (this.historyChart) this.historyChart.destroy();

    const ctx = this.historyCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const hist = this.monthlyHistory();
    const labels = hist.map(h => h.label);
    const incomeData = hist.map(h => h.incomes);
    const expenseData = hist.map(h => h.expenses);

    this.historyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10B981',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: expenseData,
            backgroundColor: 'rgba(244, 63, 94, 0.85)',
            borderColor: '#F43F5E',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#94A3B8', font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#FFFFFF',
            bodyColor: '#E2E8F0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (item) => {
                const val = Number(item.raw) || 0;
                return ` ${item.dataset.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#CBD5E1', font: { weight: 'bold', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11 },
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  onIncomeAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    if (!raw) {
      this.newIncomeAmount.set(null);
      this.newIncomeAmountFormatted.set('');
      return;
    }
    const numeric = parseFloat(raw) / 100;
    this.newIncomeAmount.set(numeric);
    this.newIncomeAmountFormatted.set(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  openIncomeModal(): void {
    this.newIncomeDescription.set('');
    this.newIncomeSource.set('Salário');
    this.newIncomeAmount.set(null);
    this.newIncomeAmountFormatted.set('');
    this.newIncomeDate.set(new Date().toISOString().substring(0, 10));
    this.newIncomeRecipientId.set(1);
    this.isIncomeModalOpen.set(true);
  }

  closeIncomeModal(): void {
    this.isIncomeModalOpen.set(false);
  }

  saveIncome(): void {
    const desc = this.newIncomeDescription().trim();
    const amount = Number(this.newIncomeAmount());

    if (!desc) {
      this.toastr.warning('Informe a descrição da receita.', 'Campo Obrigatório');
      return;
    }

    if (!amount || amount <= 0) {
      this.toastr.warning('Informe um valor válido maior que zero.', 'Valor Inválido');
      return;
    }

    const newIncome: Income = {
      description: desc,
      source: this.newIncomeSource(),
      amount: amount,
      date: this.newIncomeDate(),
      recipientId: Number(this.newIncomeRecipientId()),
      received: true
    };

    this.incomeService.addIncome(newIncome).subscribe({
      next: () => {
        this.toastr.success(`Receita "${desc}" registrada com sucesso!`, 'Receita Salva');
        this.closeIncomeModal();
        this.incomeService.getIncomes().subscribe(list => this.allIncomes.set(list));
      },
      error: () => {
        this.toastr.error('Erro ao salvar a receita.', 'Erro');
      }
    });
  }

  getBudgetProgress(budget: Budget): number {
    if (!budget.monthlyLimit) return 0;
    return Math.min(Math.round((budget.currentSpent / budget.monthlyLimit) * 100), 100);
  }
}
