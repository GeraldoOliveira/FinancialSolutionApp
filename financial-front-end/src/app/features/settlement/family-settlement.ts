import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../expense/services/expense.service';
import { ResponsibleService } from '../../core/services/responsible.service';
import { SettlementService } from './services/settlement.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { DebtSettlement, ResponsibleBalanceSummary } from '../../shared/models/settlement';
import { Responsible } from '../../shared/models/responsible';
import { PixGenerator } from '../../shared/utils/pix-generator';
import { ToastrService } from 'ngx-toastr';
import { Expense } from '../../shared/models/expense-transaction';

import { PeriodFilterService } from '../../core/services/period-filter.service';

@Component({
  selector: 'app-family-settlement',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './family-settlement.html'
})
export class FamilySettlement implements OnInit {
  public allExpenses = signal<Expense[]>([]);
  public statusVersion = signal<number>(0);

  // Modal de Pagamento PIX
  public isPixModalOpen = signal(false);
  public activeSettlement = signal<DebtSettlement | null>(null);
  public activeCreditor = signal<Responsible | null>(null);
  public pixPayload = signal<string>('');
  public pixQrCodeUrl = signal<string>('');
  public isCopying = signal(false);

  public selectedMonthYear = computed(() => this.periodService.selectedMonthYear());
  public formattedMonthName = computed(() => this.periodService.formattedMonthYear());

  public settlementResult = computed(() => {
    this.statusVersion();
    const expenses = this.allExpenses();
    const responsibles = this.responsibleService.responsiblesSignal();
    const monthYear = this.selectedMonthYear();
    return this.settlementService.calculateSettlement(expenses, responsibles, monthYear);
  });

  public balances = computed(() => this.settlementResult().balances);
  public settlements = computed(() => this.settlementResult().settlements);

  constructor(
    private expenseService: ExpenseService,
    public responsibleService: ResponsibleService,
    public periodService: PeriodFilterService,
    private settlementService: SettlementService,
    private whatsappService: WhatsappService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.expenseService.getAllTransactions().subscribe(expenses => {
      this.allExpenses.set(expenses);
    });
  }

  recalculate(): void {
    this.statusVersion.update(v => v + 1);
  }

  toggleSettleDebt(settlement: DebtSettlement): void {
    const newSettled = !settlement.settled;
    settlement.settled = newSettled;
    settlement.settledDate = newSettled ? new Date().toLocaleDateString('pt-BR') : undefined;

    const key = `${settlement.monthYear}_${settlement.fromResponsibleId}_${settlement.toResponsibleId}`;
    this.settlementService.saveSettlementStatus(key, newSettled, settlement.settledDate);

    if (newSettled) {
      this.toastr.success(`Transferência de R$ ${settlement.amount.toFixed(2)} de ${settlement.fromName} para ${settlement.toName} quitada com sucesso!`, 'Acerto Quitado');
    } else {
      this.toastr.info(`Acerto reaberto com sucesso.`, 'Status Atualizado');
    }

    this.statusVersion.update(v => v + 1);

    if (this.isPixModalOpen()) {
      this.closePixModal();
    }
  }

  settleDebt(settlement: DebtSettlement): void {
    this.toggleSettleDebt(settlement);
  }

  openPixModal(settlement: DebtSettlement): void {
    this.activeSettlement.set(settlement);
    const creditor = this.responsibleService.getResponsibleById(settlement.toResponsibleId);

    if (!creditor) {
      this.toastr.error('Credor não encontrado.', 'Erro');
      return;
    }

    this.activeCreditor.set(creditor);

    // Chave PIX do credor (ou fallback se não houver)
    const pixKey = creditor.pixKey || creditor.phone || creditor.email || '11999990001';

    // Gera o código PIX Copia e Cola padrão do Banco Central
    const payload = PixGenerator.generatePayload({
      pixKey: pixKey,
      merchantName: creditor.name,
      merchantCity: creditor.city || 'SAO PAULO',
      amount: settlement.amount,
      txId: `ACERTO${settlement.fromResponsibleId}P${settlement.toResponsibleId}`
    });

    this.pixPayload.set(payload);

    // Gera o QR Code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(payload)}`;
    this.pixQrCodeUrl.set(qrUrl);

    this.isPixModalOpen.set(true);
  }

  closePixModal(): void {
    this.isPixModalOpen.set(false);
    this.activeSettlement.set(null);
    this.activeCreditor.set(null);
  }

  copyPixPayload(): void {
    const code = this.pixPayload();
    if (!code) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.isCopying.set(true);
        this.toastr.success('Código PIX Copia e Cola copiado para a área de transferência!', 'Copiado');
        setTimeout(() => this.isCopying.set(false), 2000);
      }).catch(() => {
        this.fallbackCopy(code);
      });
    } else {
      this.fallbackCopy(code);
    }
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.toastr.success('Código PIX copiado com sucesso!', 'Copiado');
    } catch {
      this.toastr.error('Não foi possível copiar automaticamente.', 'Atenção');
    }
    document.body.removeChild(textArea);
  }


  notifyViaWhatsApp(settlement: DebtSettlement): void {
    const debtor = this.responsibleService.getResponsibleById(settlement.fromResponsibleId);
    const creditor = this.responsibleService.getResponsibleById(settlement.toResponsibleId);
    const phone = debtor?.phone || '5511999999999';

    const message = `*Olá, ${settlement.fromName}!* 👋\n\n` +
      `Aqui está o fechamento das nossas contas do mês no *Financial App*:\n\n` +
      `📊 *Valor do Acerto:* *R$ ${settlement.amount.toFixed(2)}*\n` +
      `📌 *Destinatário:* ${settlement.toName}\n` +
      `🔑 *Chave PIX:* ${creditor?.pixKey || 'Consulte no app'}\n\n` +
      `Por favor, realize a transferência para quitarmos os gastos conjuntos da casa. Obrigado! ✨`;

    this.whatsappService.openWhatsApp(phone, message);
  }
}
