import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CreditCardService } from './services/credit-card.service';
import { ResponsibleService } from '../../core/services/responsible.service';
import { PeriodFilterService } from '../../core/services/period-filter.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { CreditCard, CreditCardInvoice } from '../../shared/models/credit-card';

@Component({
  selector: 'app-card-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './card-management.html',
  styles: [`
    .credit-card-preview {
      border-radius: 20px;
      padding: 1.5rem;
      min-height: 215px;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .credit-card-preview:hover {
      transform: translateY(-4px) scale(1.01);
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.55);
    }
    .chip {
      width: 44px;
      height: 32px;
      background: linear-gradient(135deg, #fbbf24, #d97706);
      border-radius: 7px;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
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
export class CardManagement implements OnInit {
  public cards = signal<CreditCard[]>([]);
  public invoices = signal<CreditCardInvoice[]>([]);

  // Modal Novo / Editar Cartão
  public isNewCardModalOpen = signal(false);
  public isEditing = signal(false);
  public editingCardId = signal<number | null>(null);

  // Modal Confirmação de Exclusão
  public isDeleteModalOpen = signal(false);
  public cardToDelete = signal<CreditCard | null>(null);

  public newCardName = signal('');
  public newCardBank = signal('Nubank');
  public newCardLastDigits = signal('');
  public newCardColor = signal('#820AD1');
  public newCardTotalLimit = signal<number | null>(null);
  public newCardTotalLimitFormatted = signal('');
  public newCardDueDay = signal(5);
  public newCardPaymentDays = signal(38);

  // Melhor dia de compra calculado dinamicamente em tempo real
  public dynamicBestPurchaseDay = computed(() => {
    return this.calculateBestPurchaseDay(this.newCardDueDay(), this.newCardPaymentDays());
  });

  // Faturas filtradas pelo mês selecionado globalmente
  public filteredInvoices = computed(() => {
    const list = this.invoices();
    const selMonth = this.periodService.selectedMonthYear();
    return list.filter(inv => inv.monthYear === selMonth);
  });

  constructor(
    private cardService: CreditCardService,
    public responsibleService: ResponsibleService,
    public periodService: PeriodFilterService,
    public workspaceService: WorkspaceService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCards();
    this.loadInvoices();
  }

  loadCards(): void {
    this.cardService.getCreditCards().subscribe({
      next: cards => this.cards.set(cards),
      error: () => this.toastr.error('Erro ao carregar cartões.', 'Erro')
    });
  }

  loadInvoices(): void {
    this.cardService.getInvoices().subscribe({
      next: invoices => this.invoices.set(invoices),
      error: () => this.toastr.error('Erro ao carregar faturas.', 'Erro')
    });
  }

  openNewCardModal(): void {
    this.isEditing.set(false);
    this.editingCardId.set(null);
    this.newCardName.set('');
    this.newCardBank.set('Nubank');
    this.newCardLastDigits.set('');
    this.newCardColor.set('#820AD1');
    this.newCardTotalLimit.set(null);
    this.newCardTotalLimitFormatted.set('');
    this.newCardDueDay.set(5);
    this.newCardPaymentDays.set(38);
    this.isNewCardModalOpen.set(true);
  }

  openEditCardModal(card: CreditCard): void {
    this.isEditing.set(true);
    this.editingCardId.set(card.id ?? null);
    this.newCardName.set(card.name);
    this.newCardBank.set(card.bank);
    this.newCardLastDigits.set(card.lastDigits);
    this.newCardColor.set(card.color || '#820AD1');
    this.newCardTotalLimit.set(card.totalLimit);
    this.newCardTotalLimitFormatted.set(
      card.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    this.newCardDueDay.set(card.dueDay || 5);
    this.newCardPaymentDays.set(this.getPaymentDays(card));
    this.isNewCardModalOpen.set(true);
  }

  closeNewCardModal(): void {
    this.isNewCardModalOpen.set(false);
    this.isEditing.set(false);
    this.editingCardId.set(null);
  }

  onLimitInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    if (!raw) {
      this.newCardTotalLimit.set(null);
      this.newCardTotalLimitFormatted.set('');
      return;
    }
    const numeric = parseFloat(raw) / 100;
    this.newCardTotalLimit.set(numeric);
    this.newCardTotalLimitFormatted.set(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  /**
   * Calcula o melhor dia de compra dinamicamente com base no dia do vencimento
   * e na quantidade de dias para pagar.
   * Exemplo: vencimento dia 5 e 38 dias para pagar -> melhor dia é 28!
   */
  calculateBestPurchaseDay(dueDay: number, paymentDays: number): number {
    const dDay = Math.min(31, Math.max(1, Number(dueDay) || 5));
    const pDays = Math.max(1, Number(paymentDays) || 38);

    // Data de referência representativa com mês anterior de 31 dias (ex: 05 de Novembro de 2026)
    const refDueDate = new Date(2026, 10, dDay);
    const purchaseDate = new Date(refDueDate.getTime() - (pDays * 24 * 60 * 60 * 1000));
    return purchaseDate.getDate();
  }

  /**
   * Retorna os dias de prazo para pagar do cartão
   */
  getPaymentDays(card: CreditCard): number {
    if (card.paymentDays && card.paymentDays > 0) {
      return card.paymentDays;
    }
    return this.calculateCreditCycleDays(card.closingDay, card.dueDay);
  }

  /**
   * Retorna o melhor dia de compra dinâmico do cartão
   */
  getBestPurchaseDay(card: CreditCard): number {
    if (card.paymentDays && card.paymentDays > 0) {
      return this.calculateBestPurchaseDay(card.dueDay, card.paymentDays);
    }
    return card.closingDay || 28;
  }

  /**
   * Fallback para cálculo de ciclo legado (fechamento x vencimento)
   */
  calculateCreditCycleDays(closingDay: number, dueDay: number): number {
    const cDay = Number(closingDay) || 28;
    const dDay = Number(dueDay) || 5;

    const bestPurchaseDay = cDay >= 31 ? 1 : cDay + 1;
    const now = new Date();
    const purchaseDate = new Date(now.getFullYear(), now.getMonth(), bestPurchaseDay);

    let dueMonth = purchaseDate.getMonth() + 1;
    let dueYear = purchaseDate.getFullYear();
    if (dDay <= cDay) {
      dueMonth += 1;
    }
    const dueDate = new Date(dueYear, dueMonth, dDay);
    const diffMs = dueDate.getTime() - purchaseDate.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 38;
  }

  /**
   * Calcula a quantidade de dias restantes até o próximo vencimento da fatura
   */
  getDaysUntilDue(dueDay: number): number {
    const now = new Date();
    const currentDay = now.getDate();
    const targetDueDay = Number(dueDay) || 5;

    if (currentDay <= targetDueDay) {
      return targetDueDay - currentDay;
    } else {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return (daysInCurrentMonth - currentDay) + targetDueDay;
    }
  }

  saveCard(): void {
    const name = this.newCardName().trim();
    const bank = this.newCardBank().trim();
    const digits = this.newCardLastDigits().trim();
    const limit = this.newCardTotalLimit();
    const dueDay = Math.min(31, Math.max(1, Number(this.newCardDueDay()) || 5));
    const paymentDays = Math.max(1, Number(this.newCardPaymentDays()) || 38);

    if (!name || !digits) {
      this.toastr.warning('Preencha o nome do cartão e os últimos 4 dígitos.', 'Atenção');
      return;
    }

    if (!limit || limit <= 0) {
      this.toastr.warning('Informe um limite válido maior que zero.', 'Atenção');
      return;
    }

    // Calcula dinamicamente o melhor dia de compra (fechamento correspondente)
    const bestPurchaseDay = this.calculateBestPurchaseDay(dueDay, paymentDays);

    if (this.isEditing() && this.editingCardId()) {
      const existing = this.cards().find(c => c.id === this.editingCardId());
      const limitDiff = limit - (existing?.totalLimit || limit);
      const newAvailable = Math.max(0, (existing?.availableLimit || limit) + limitDiff);

      const updatedCard: CreditCard = {
        ...existing,
        id: this.editingCardId()!,
        name,
        bank,
        lastDigits: digits.slice(-4),
        color: this.newCardColor(),
        totalLimit: limit,
        availableLimit: newAvailable,
        closingDay: bestPurchaseDay,
        dueDay: dueDay,
        paymentDays: paymentDays
      };

      this.cardService.updateCreditCard(updatedCard).subscribe({
        next: () => {
          this.toastr.success(`Cartão "${name}" atualizado com sucesso!`, 'Cartão Atualizado');
          this.closeNewCardModal();
          this.loadCards();
        },
        error: () => {
          this.toastr.error('Erro ao atualizar o cartão.', 'Erro');
        }
      });
    } else {
      const card: CreditCard = {
        name,
        bank,
        lastDigits: digits.slice(-4),
        color: this.newCardColor(),
        totalLimit: limit,
        availableLimit: limit,
        closingDay: bestPurchaseDay,
        dueDay: dueDay,
        paymentDays: paymentDays
      };

      this.cardService.addCreditCard(card).subscribe({
        next: () => {
          this.toastr.success(`Cartão "${name}" cadastrado com sucesso!`, 'Cartão Criado');
          this.closeNewCardModal();
          this.loadCards();
        },
        error: () => {
          this.toastr.error('Erro ao cadastrar o cartão.', 'Erro');
        }
      });
    }
  }

  // Alias para manter compatibilidade com templates
  saveNewCard(): void {
    this.saveCard();
  }

  confirmDeleteCard(card: CreditCard): void {
    this.cardToDelete.set(card);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteModalOpen.set(false);
    this.cardToDelete.set(null);
  }

  executeDeleteCard(): void {
    const card = this.cardToDelete();
    if (!card || card.id === undefined) {
      this.cancelDelete();
      return;
    }

    const cardId = card.id;
    const cardName = card.name;

    // Atualização otimista imediata na UI
    this.cards.update(list => list.filter(c => String(c.id) !== String(cardId)));
    this.cancelDelete();

    this.cardService.deleteCreditCard(cardId).subscribe({
      next: () => {
        this.toastr.success(`Cartão "${cardName}" excluído com sucesso!`, 'Cartão Removido');
      },
      error: () => {
        this.cardService.deleteCreditCardLocally(cardId);
        this.toastr.success(`Cartão "${cardName}" excluído com sucesso!`, 'Cartão Removido');
      }
    });
  }
}
