import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IncomeService } from './services/income.service';
import { ResponsibleService } from '../../core/services/responsible.service';
import { PeriodFilterService } from '../../core/services/period-filter.service';
import { Income } from '../../shared/models/income';

@Component({
  selector: 'app-income-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './income-management.html'
})
export class IncomeManagement implements OnInit {
  public incomes = signal<Income[]>([]);
  public isLoading = signal<boolean>(false);

  // Filtros
  public searchTerm = signal<string>('');
  public selectedStatus = signal<'ALL' | 'RECEIVED' | 'PENDING'>('ALL');
  public selectedRecipientId = signal<string>('ALL');
  public filterByPeriod = signal<boolean>(true);

  // Modal
  public isModalOpen = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public currentIncomeId = signal<number | null>(null);

  // Form Fields
  public formDescription = signal<string>('');
  public formSource = signal<string>('Salário');
  public formAmount = signal<number | null>(null);
  public formAmountFormatted = signal<string>('');
  public formDate = signal<string>(new Date().toISOString().substring(0, 10));
  public formRecipientId = signal<number>(1);
  public formReceived = signal<boolean>(true);
  public formNotes = signal<string>('');

  // Fontes predefinidas
  public sources: string[] = [
    'Salário',
    'Freelance',
    'Dividendos & Investimentos',
    'Aluguel',
    'Bônus / PLR',
    'Reembolso',
    'Vendas',
    'Outros'
  ];

  // Receitas do período selecionado
  public periodIncomes = computed(() => {
    const list = this.incomes();
    const sel = this.periodService.selectedMonthYear();
    const applyPeriod = this.filterByPeriod();

    if (!applyPeriod || !sel) return list;

    return list.filter(item => {
      if (!item.date) return false;
      const dStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString();
      return dStr.startsWith(sel);
    });
  });

  // Métricas Computadas
  public totalIncome = computed(() => {
    return this.periodIncomes().reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  public receivedIncome = computed(() => {
    return this.periodIncomes()
      .filter(item => item.received)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  public pendingIncome = computed(() => {
    return this.periodIncomes()
      .filter(item => !item.received)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  public receivedPercentage = computed(() => {
    const total = this.totalIncome();
    if (total === 0) return 0;
    return Math.round((this.receivedIncome() / total) * 100);
  });

  // Lista Filtrada
  public filteredIncomes = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();
    const recipient = this.selectedRecipientId();

    return this.periodIncomes().filter(item => {
      const matchesSearch = !term ||
        item.description.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term));

      const matchesStatus =
        status === 'ALL' ||
        (status === 'RECEIVED' && item.received) ||
        (status === 'PENDING' && !item.received);

      const matchesRecipient =
        recipient === 'ALL' || String(item.recipientId) === String(recipient);

      return matchesSearch && matchesStatus && matchesRecipient;
    });
  });

  constructor(
    private incomeService: IncomeService,
    public responsibleService: ResponsibleService,
    public periodService: PeriodFilterService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadIncomes();
  }

  loadIncomes(): void {
    this.isLoading.set(true);
    this.incomeService.getIncomes().subscribe({
      next: (list) => {
        this.incomes.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastr.error('Erro ao carregar lista de receitas.', 'Erro');
        this.isLoading.set(false);
      }
    });
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    if (!raw) {
      this.formAmount.set(null);
      this.formAmountFormatted.set('');
      return;
    }
    const numeric = parseFloat(raw) / 100;
    this.formAmount.set(numeric);
    this.formAmountFormatted.set(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  openNewIncomeModal(): void {
    this.isEditing.set(false);
    this.currentIncomeId.set(null);
    this.formDescription.set('');
    this.formSource.set('Salário');
    this.formAmount.set(null);
    this.formAmountFormatted.set('');
    this.formDate.set(new Date().toISOString().substring(0, 10));
    this.formRecipientId.set(this.responsibleService.responsiblesSignal()[0]?.id || 1);
    this.formReceived.set(true);
    this.formNotes.set('');
    this.isModalOpen.set(true);
  }

  openEditIncomeModal(income: Income): void {
    this.isEditing.set(true);
    this.currentIncomeId.set(income.id || null);
    this.formDescription.set(income.description);
    this.formSource.set(income.source);
    this.formAmount.set(income.amount);
    this.formAmountFormatted.set(
      income.amount ? income.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    );
    this.formDate.set(income.date ? income.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
    this.formRecipientId.set(income.recipientId);
    this.formReceived.set(income.received);
    this.formNotes.set(income.notes || '');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveIncome(): void {
    const desc = this.formDescription().trim();
    const amount = this.formAmount();

    if (!desc) {
      this.toastr.warning('Por favor, informe uma descrição para a receita.', 'Atenção');
      return;
    }

    if (!amount || amount <= 0) {
      this.toastr.warning('Por favor, informe um valor monetário válido maior que zero.', 'Atenção');
      return;
    }

    const payload: Income = {
      description: desc,
      source: this.formSource(),
      amount: Number(amount),
      date: this.formDate(),
      recipientId: Number(this.formRecipientId()),
      received: this.formReceived(),
      notes: this.formNotes().trim()
    };

    if (this.isEditing() && this.currentIncomeId()) {
      this.incomeService.updateIncome(this.currentIncomeId()!, payload).subscribe({
        next: () => {
          this.toastr.success('Receita atualizada com sucesso!', 'Sucesso');
          this.closeModal();
          this.loadIncomes();
        },
        error: () => this.toastr.error('Erro ao atualizar receita.', 'Erro')
      });
    } else {
      this.incomeService.addIncome(payload).subscribe({
        next: () => {
          this.toastr.success('Receita registrada com sucesso!', 'Sucesso');
          this.closeModal();
          this.loadIncomes();
        },
        error: () => this.toastr.error('Erro ao adicionar receita.', 'Erro')
      });
    }
  }

  toggleReceived(income: Income): void {
    if (!income.id) return;
    const newStatus = !income.received;
    this.incomeService.updateIncome(income.id, { received: newStatus }).subscribe({
      next: () => {
        this.toastr.info(
          newStatus ? 'Receita marcada como recebida!' : 'Receita marcada como pendente.',
          'Status Atualizado'
        );
        this.loadIncomes();
      },
      error: () => this.toastr.error('Erro ao alterar status da receita.', 'Erro')
    });
  }

  deleteIncome(income: Income): void {
    if (!income.id) return;
    if (confirm(`Tem certeza que deseja excluir a receita "${income.description}" no valor de R$ ${income.amount}?`)) {
      this.incomeService.deleteIncome(income.id).subscribe({
        next: () => {
          this.toastr.success('Receita removida com sucesso!', 'Excluído');
          this.loadIncomes();
        },
        error: () => this.toastr.error('Erro ao remover receita.', 'Erro')
      });
    }
  }

  getSourceIcon(source: string): string {
    switch (source.toLowerCase()) {
      case 'salário':
        return 'fas fa-briefcase';
      case 'freelance':
        return 'fas fa-laptop-code';
      case 'dividendos & investimentos':
      case 'investimentos':
        return 'fas fa-chart-line';
      case 'aluguel':
        return 'fas fa-home';
      case 'bônus / plr':
        return 'fas fa-award';
      case 'reembolso':
        return 'fas fa-undo-alt';
      case 'vendas':
        return 'fas fa-shopping-bag';
      default:
        return 'fas fa-hand-holding-usd';
    }
  }
}
