import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ExternalDebt } from '../../../shared/models/workspace';
import { PixGenerator } from '../../../shared/utils/pix-generator';
import { ToastrService } from 'ngx-toastr';

import { PeriodFilterService } from '../../../core/services/period-filter.service';

@Component({
  selector: 'app-external-debts',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, FormsModule],
  templateUrl: './external-debts.html',
  styleUrls: []
})
export class ExternalDebts implements OnInit {
  public filterStatus = signal<'ALL' | 'PENDING' | 'PAID'>('PENDING');
  public filterByPeriod = signal<boolean>(false);
  public isPixModalOpen = signal(false);
  public activeDebt = signal<ExternalDebt | null>(null);
  public pixPayload = signal<string>('');
  public pixQrCodeUrl = signal<string>('');
  public isCopying = signal(false);

  public selectedMonthYear = computed(() => this.periodService.selectedMonthYear());
  public formattedMonthName = computed(() => this.periodService.formattedMonthYear());

  public debts = computed(() => {
    const list = this.workspaceService.externalDebts();
    if (!this.filterByPeriod()) return list;
    const sel = this.selectedMonthYear();
    return list.filter(d => (d.cycle && d.cycle === sel) || (d.date && d.date.startsWith(sel)));
  });

  public filteredDebts = computed(() => {
    const list = this.debts();
    const filter = this.filterStatus();
    if (filter === 'ALL') return list;
    return list.filter(d => d.status === filter);
  });

  public totalPending = computed(() => {
    return this.debts()
      .filter(d => d.status === 'PENDING')
      .reduce((acc, curr) => acc + curr.myShare, 0);
  });

  public totalPaid = computed(() => {
    return this.debts()
      .filter(d => d.status === 'PAID')
      .reduce((acc, curr) => acc + curr.myShare, 0);
  });

  constructor(
    public workspaceService: WorkspaceService,
    public periodService: PeriodFilterService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.workspaceService.loadExternalDebts().subscribe();
  }

  openPixModal(debt: ExternalDebt): void {
    this.activeDebt.set(debt);
    if (debt.adminPixKey) {
      const payload = PixGenerator.generatePayload({
        pixKey: debt.adminPixKey,
        merchantName: debt.adminName || debt.workspaceName,
        merchantCity: 'SAO PAULO',
        amount: debt.myShare,
        txId: `DEBT${debt.id}`
      });
      this.pixPayload.set(payload);
      this.pixQrCodeUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`);
    } else {
      this.pixPayload.set('');
      this.pixQrCodeUrl.set('');
    }
    this.isPixModalOpen.set(true);
  }

  closePixModal(): void {
    this.isPixModalOpen.set(false);
    this.activeDebt.set(null);
  }

  copyToClipboard(text: string, label: string = 'Texto'): void {
    if (!text) return;
    this.isCopying.set(true);
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success(`${label} copiado para a área de transferência!`, 'Copiado');
      setTimeout(() => this.isCopying.set(false), 1500);
    }).catch(() => {
      this.toastr.error('Não foi possível copiar automaticamente.', 'Atenção');
      this.isCopying.set(false);
    });
  }

  markAsPaid(debt: ExternalDebt): void {
    if (confirm(`Confirmar que realizou o pagamento de R$ ${debt.myShare.toFixed(2)} para ${debt.adminName}?`)) {
      this.workspaceService.payExternalDebt(debt.id).subscribe({
        next: () => {
          this.toastr.success('Reembolso registrado com sucesso! O administrador do rateio foi notificado.', 'Pagamento Informado');
          if (this.isPixModalOpen()) {
            this.closePixModal();
          }
        },
        error: (err) => {
          this.toastr.error('Erro ao registrar pagamento: ' + (err?.error?.error || err.message));
        }
      });
    }
  }
}
