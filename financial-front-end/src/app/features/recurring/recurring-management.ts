import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RecurringExpenseService } from './services/recurring.service';
import { ResponsibleService } from '../../core/services/responsible.service';
import { CreditCardService } from '../cards/services/credit-card.service';
import { PeriodFilterService } from '../../core/services/period-filter.service';
import { RecurringExpense } from '../../shared/models/recurring-expense';

@Component({
  selector: 'app-recurring-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './recurring-management.html',
  styles: [`
    .recurring-card {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .recurring-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
    }
    .currency-prefix-badge {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      font-weight: 800;
      color: #818cf8;
      pointer-events: none;
      z-index: 10;
    }
  `]
})
export class RecurringManagement implements OnInit {
  // Modal Novo / Editar
  public isModalOpen = signal(false);
  public isEditing = signal(false);
  public editingId = signal<number | string | null>(null);

  public formTitle = signal('');
  public formCategory = signal('Streaming & Lazer');
  public formAmount = signal<number | null>(null);
  public formAmountFormatted = signal('');
  public formDueDay = signal(10);
  public formPaymentMethod = signal('1'); // '1' Cartão, '2' Pix
  public formCreditCardId = signal<number | null>(1);
  public formNotes = signal('');

  // Tipo de Divisão: 'FIXED' ou 'ROTATING'
  public formSplitType = signal<'FIXED' | 'ROTATING'>('FIXED');

  // Rateio por contato no modal (Modo Fixo)
  public formSplits = signal<{ responsibleId: number; proratedValue: number }[]>([]);

  // Configurações do Rodízio / Cobrança Alternada
  public formRotationOrder = signal<number[]>([]);
  public formRotationStartMonth = signal<string>('2026-10');

  // Modal Exclusão
  public isDeleteModalOpen = signal(false);
  public itemToDelete = signal<RecurringExpense | null>(null);

  // Estado de processamento
  public isProcessing = signal(false);

  // Categorias Sugeridas
  public categories = [
    'Streaming & Lazer',
    'Moradia',
    'Serviços & Utilidades',
    'Saúde & Bem-estar',
    'Educação',
    'Seguros & Outros'
  ];

  // Totais Computados Reativos com o Mês Selecionado
  public totalMonthlyFixed = computed(() => {
    return this.recurringService.recurringSignal()
      .filter(r => r.active)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  });

  public myShareTotal = computed(() => {
    const selMonth = this.periodService.selectedMonthYear();
    // Neto (ID 2) é o administrador logado
    return this.recurringService.recurringSignal()
      .filter(r => r.active)
      .reduce((sum, r) => {
        if (r.splitType === 'ROTATING') {
          const rotatingResp = this.recurringService.getRotatingResponsibleForMonth(r, selMonth);
          return sum + (rotatingResp === 2 ? (r.amount || 0) : 0);
        }
        const mySplit = r.responsiblesSplit?.find(s => Number(s.responsibleId) === 2);
        return sum + (mySplit ? mySplit.proratedValue : (r.amount || 0));
      }, 0);
  });

  public contactsShareTotal = computed(() => {
    const selMonth = this.periodService.selectedMonthYear();
    return this.recurringService.recurringSignal()
      .filter(r => r.active)
      .reduce((sum, r) => {
        if (r.splitType === 'ROTATING') {
          const rotatingResp = this.recurringService.getRotatingResponsibleForMonth(r, selMonth);
          return sum + (rotatingResp !== 2 && rotatingResp !== null ? (r.amount || 0) : 0);
        }
        const otherSplits = (r.responsiblesSplit || []).filter(s => Number(s.responsibleId) !== 2);
        return sum + otherSplits.reduce((acc, s) => acc + s.proratedValue, 0);
      }, 0);
  });

  // Quantidade pendente de lançamento para o ciclo atual
  public pendingForCycle = computed(() => {
    const selMonth = this.periodService.selectedMonthYear();
    return this.recurringService.recurringSignal()
      .filter(r => r.active && r.lastProcessedMonth !== selMonth);
  });

  constructor(
    public recurringService: RecurringExpenseService,
    public responsibleService: ResponsibleService,
    public cardService: CreditCardService,
    public periodService: PeriodFilterService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cardService.getCreditCards().subscribe();
    this.autoCheckCycle();
  }

  /**
   * Verifica se o ciclo atual necessita de processamento automático
   */
  autoCheckCycle(): void {
    const selMonth = this.periodService.selectedMonthYear();
    const pend = this.recurringService.recurringSignal().filter(r => r.active && r.lastProcessedMonth !== selMonth);
    // Se quiser processar automaticamente na virada de ciclo sem intervenção:
    if (pend.length > 0) {
      console.log(`[Automação] ${pend.length} despesas recorrentes prontas para o ciclo ${selMonth}`);
    }
  }

  processRecurringCycle(): void {
    const selMonth = this.periodService.selectedMonthYear();
    const count = this.pendingForCycle().length;

    if (count === 0) {
      this.toastr.info(`Todas as despesas recorrentes ativas já foram lançadas para ${this.periodService.formattedMonthYear()}.`, 'Ciclo Atualizado');
      return;
    }

    this.isProcessing.set(true);
    this.recurringService.processCycleRecurring(selMonth).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.toastr.success(`${count} despesas recorrentes foram lançadas automaticamente no ciclo de ${this.periodService.formattedMonthYear()}!`, 'Automação Concluída');
      },
      error: () => {
        this.isProcessing.set(false);
        this.toastr.error('Erro ao processar as despesas recorrentes.', 'Erro');
      }
    });
  }

  openNewModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formTitle.set('');
    this.formCategory.set('Streaming & Lazer');
    this.formAmount.set(null);
    this.formAmountFormatted.set('');
    this.formDueDay.set(10);
    this.formPaymentMethod.set('1');
    const cards = this.cardService.cardsSignal();
    this.formCreditCardId.set(cards.length > 0 ? (cards[0].id ?? 1) : 1);
    this.formNotes.set('');
    this.formSplitType.set('FIXED');

    // Inicializa lista padrão de rodízio: Neto (2), Anelise (1), Gabriella (4 se existir ou 3)
    const responsibles = this.responsibleService.responsiblesSignal();
    const defaultRotation = responsibles.slice(0, 3).map(r => r.id);
    this.formRotationOrder.set(defaultRotation.length > 0 ? defaultRotation : [2]);
    this.formRotationStartMonth.set(this.periodService.selectedMonthYear());

    // Preenche rateio fixo padrão entre os responsáveis
    this.formSplits.set(responsibles.map(r => ({
      responsibleId: r.id,
      proratedValue: 0
    })));

    this.isModalOpen.set(true);
  }

  openEditModal(item: RecurringExpense): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.formTitle.set(item.title);
    this.formCategory.set(item.category);
    this.formAmount.set(item.amount);
    this.formAmountFormatted.set(
      item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    this.formDueDay.set(item.dueDay);
    this.formPaymentMethod.set(item.paymentMethod || '1');
    this.formCreditCardId.set(item.creditCardId || 1);
    this.formNotes.set(item.notes || '');

    // Tipo de Rateio
    this.formSplitType.set(item.splitType || 'FIXED');

    // Rodízio
    if (item.rotationOrder && item.rotationOrder.length > 0) {
      this.formRotationOrder.set([...item.rotationOrder]);
    } else {
      const responsibles = this.responsibleService.responsiblesSignal();
      this.formRotationOrder.set(responsibles.slice(0, 3).map(r => r.id));
    }
    this.formRotationStartMonth.set(item.rotationStartMonth || this.periodService.selectedMonthYear());

    // Splits existentes ou preenche com todos os contatos
    const responsibles = this.responsibleService.responsiblesSignal();
    const existingSplits = item.responsiblesSplit || [];

    const mapped = responsibles.map(r => {
      const match = existingSplits.find(s => s.responsibleId === r.id);
      return {
        responsibleId: r.id,
        proratedValue: match ? match.proratedValue : 0
      };
    });

    this.formSplits.set(mapped);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isEditing.set(false);
    this.editingId.set(null);
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

  splitEqually(): void {
    const total = this.formAmount() || 0;
    const splits = this.formSplits();
    if (splits.length === 0 || total <= 0) return;

    const count = splits.length;
    const perPerson = Math.round((total / count) * 100) / 100;
    let accumulated = 0;

    const updated = splits.map((s, idx) => {
      if (idx === count - 1) {
        // Ajusta arredondamento na última pessoa
        return { ...s, proratedValue: Math.max(0, Math.round((total - accumulated) * 100) / 100) };
      }
      accumulated += perPerson;
      return { ...s, proratedValue: perPerson };
    });

    this.formSplits.set(updated);
  }

  onSplitChange(responsibleId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    const numeric = raw ? parseFloat(raw) / 100 : 0;

    this.formSplits.update(splits =>
      splits.map(s => s.responsibleId === responsibleId ? { ...s, proratedValue: numeric } : s)
    );
  }

  // --- Gerenciamento da Fila de Rodízio / Cobrança Alternada ---
  addToRotation(respId: number): void {
    if (!this.formRotationOrder().includes(respId)) {
      this.formRotationOrder.update(order => [...order, respId]);
    }
  }

  removeFromRotation(index: number): void {
    this.formRotationOrder.update(order => order.filter((_, i) => i !== index));
  }

  moveRotationUp(index: number): void {
    if (index <= 0) return;
    this.formRotationOrder.update(order => {
      const copy = [...order];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }

  moveRotationDown(index: number): void {
    const order = this.formRotationOrder();
    if (index >= order.length - 1) return;
    this.formRotationOrder.update(list => {
      const copy = [...list];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }

  getAvailableContactsForRotation(): any[] {
    const currentSelected = this.formRotationOrder();
    return this.responsibleService.responsiblesSignal().filter(r => !currentSelected.includes(r.id));
  }

  /**
   * Gera a previsão detalhada dos próximos 4 a 6 meses do rodízio em tempo real
   */
  getRotationTimelinePreview(): { monthYear: string; label: string; responsibleName: string; color: string; isCurrent: boolean; isCycleReset: boolean }[] {
    const order = this.formRotationOrder();
    if (order.length === 0) return [];

    const startMonth = this.formRotationStartMonth() || this.periodService.selectedMonthYear();
    const [startYear, startM] = startMonth.split('-').map(Number);
    const selMonth = this.periodService.selectedMonthYear();

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const timeline = [];

    // Mostra 5 meses a partir do mês atual selecionado
    const [selYear, selM] = selMonth.split('-').map(Number);

    for (let i = 0; i < 5; i++) {
      let targetM = selM + i;
      let targetYear = selYear;
      while (targetM > 12) {
        targetM -= 12;
        targetYear += 1;
      }

      const mStr = String(targetM).padStart(2, '0');
      const targetKey = `${targetYear}-${mStr}`;
      const diff = (targetYear - startYear) * 12 + (targetM - startM);
      const len = order.length;
      const idx = ((diff % len) + len) % len;
      const respId = order[idx];
      const resp = this.responsibleService.getResponsibleById(respId);

      timeline.push({
        monthYear: targetKey,
        label: `${monthNames[targetM - 1]}/${targetYear}`,
        responsibleName: resp ? resp.name : `Contato #${respId}`,
        color: resp?.color || '#3B82F6',
        isCurrent: targetKey === selMonth,
        isCycleReset: idx === 0 && i > 0
      });
    }

    return timeline;
  }

  /**
   * Retorna o responsável da vez no ciclo selecionado para um card
   */
  getRotatingResponsible(rec: RecurringExpense) {
    const selMonth = this.periodService.selectedMonthYear();
    const respId = this.recurringService.getRotatingResponsibleForMonth(rec, selMonth);
    return respId ? this.responsibleService.getResponsibleById(respId) : null;
  }

  /**
   * Retorna o responsável da vez no próximo ciclo para um card
   */
  getNextRotatingResponsible(rec: RecurringExpense) {
    const selMonth = this.periodService.selectedMonthYear();
    const [y, m] = selMonth.split('-').map(Number);
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextKey = `${nextY}-${String(nextM).padStart(2, '0')}`;
    const respId = this.recurringService.getRotatingResponsibleForMonth(rec, nextKey);
    return respId ? this.responsibleService.getResponsibleById(respId) : null;
  }

  saveRecurring(): void {
    const title = this.formTitle().trim();
    const amount = this.formAmount();
    const dueDay = Math.min(31, Math.max(1, Number(this.formDueDay()) || 10));
    const splitType = this.formSplitType();

    if (!title) {
      this.toastr.warning('Informe o título da despesa fixa ou assinatura.', 'Atenção');
      return;
    }

    if (!amount || amount <= 0) {
      this.toastr.warning('Informe um valor mensal válido maior que zero.', 'Atenção');
      return;
    }

    if (splitType === 'ROTATING' && this.formRotationOrder().length === 0) {
      this.toastr.warning('Selecione pelo menos uma pessoa na fila do rodízio.', 'Atenção');
      return;
    }

    // Filtra splits com valor maior que 0 para modo FIXED
    const activeSplits = this.formSplits().filter(s => s.proratedValue > 0);

    const data: Omit<RecurringExpense, 'id'> = {
      title,
      category: this.formCategory(),
      amount,
      dueDay,
      paymentMethod: this.formPaymentMethod(),
      creditCardId: this.formPaymentMethod() === '1' ? (this.formCreditCardId() || 1) : undefined,
      active: true,
      splitType,
      responsiblesSplit: splitType === 'ROTATING'
        ? [{ responsibleId: this.formRotationOrder()[0] || 2, proratedValue: amount }]
        : (activeSplits.length > 0 ? activeSplits : [{ responsibleId: 2, proratedValue: amount }]),
      rotationOrder: splitType === 'ROTATING' ? this.formRotationOrder() : undefined,
      rotationStartMonth: splitType === 'ROTATING' ? (this.formRotationStartMonth() || this.periodService.selectedMonthYear()) : undefined,
      notes: this.formNotes().trim() || undefined
    };

    if (this.isEditing() && this.editingId()) {
      this.recurringService.updateRecurringExpense({
        ...data,
        id: this.editingId()!
      });
      this.toastr.success(`Assinatura "${title}" atualizada com sucesso!`, 'Atualizada');
    } else {
      this.recurringService.addRecurringExpense(data);
      this.toastr.success(`Recorrência "${title}" cadastrada com sucesso!`, 'Cadastrado');
    }

    this.closeModal();
  }

  toggleActive(item: RecurringExpense): void {
    this.recurringService.toggleActive(item.id);
    const status = !item.active ? 'ativada' : 'pausada';
    this.toastr.info(`Assinatura "${item.title}" foi ${status}.`, 'Status');
  }

  confirmDelete(item: RecurringExpense): void {
    this.itemToDelete.set(item);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete.set(null);
  }

  executeDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.recurringService.deleteRecurringExpense(item.id);
    this.toastr.success(`"${item.title}" removido com sucesso.`, 'Excluído');
    this.cancelDelete();
  }

  getCardName(cardId?: number): string {
    if (!cardId) return 'Cartão de Crédito';
    const card = this.cardService.cardsSignal().find(c => c.id === cardId);
    return card ? `${card.name} (final ${card.lastDigits})` : `Cartão #${cardId}`;
  }
}
