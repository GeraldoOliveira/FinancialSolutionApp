import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ResponsibleService } from '../../core/services/responsible.service';
import { PeriodFilterService } from '../../core/services/period-filter.service';
import { ExpenseService } from '../expense/services/expense.service';
import { SettlementService } from '../settlement/services/settlement.service';
import { Responsible } from '../../shared/models/responsible';
import { Expense } from '../../shared/models/expense-transaction';
import { CurrencyUtils } from '../../shared/utils/currency-utils';

@Component({
  selector: 'app-contact-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './contact-management.html',
  styles: [`
    .contact-card {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .contact-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
    }
  `]
})
export class ContactManagement implements OnInit {
  public expenses = signal<Expense[]>([]);

  // Modal Novo / Editar Contato
  public isContactModalOpen = signal(false);
  public isEditing = signal(false);
  public editingContactId = signal<number | null>(null);

  public formName = signal('');
  public formPhone = signal('');
  public formEmail = signal('');
  public formPixKey = signal('');
  public formPixKeyType = signal<'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM'>('PHONE');
  public formColor = signal('#6366F1');
  public formNotes = signal('');

  // Modal Exclusão
  public isDeleteModalOpen = signal(false);
  public contactToDelete = signal<Responsible | null>(null);

  // Chave PIX do Administrador para receber reembolsos
  public adminPixKey = signal('gevo.neto@hotmail.com');

  constructor(
    public responsibleService: ResponsibleService,
    public periodService: PeriodFilterService,
    private expenseService: ExpenseService,
    private settlementService: SettlementService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.expenseService.getAllTransactions().subscribe({
      next: (expList) => this.expenses.set(expList || []),
      error: () => console.warn('Não foi possível carregar as despesas.')
    });
  }

  // Cota-parte de cada contato calculada para o mês selecionado
  public contactSharesMap = computed(() => {
    const map = new Map<number, number>();
    const selMonth = this.periodService.selectedMonthYear();
    const expList = this.expenses();

    this.responsibleService.responsiblesSignal().forEach(r => map.set(r.id, 0));

    const filtered = expList.filter(exp => {
      if (!exp.date) return true;
      const dStr = typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString();
      return dStr.startsWith(selMonth);
    });

    const activeList = filtered.length > 0 ? filtered : expList;

    activeList.forEach(exp => {
      if (exp.expenseResponsibles && exp.expenseResponsibles.length > 0) {
        exp.expenseResponsibles.forEach(item => {
          const respId = Number(item.responsibleId);
          const val = CurrencyUtils.StringToDecimal(item.proratedValue) || 0;
          map.set(respId, (map.get(respId) || 0) + val);
        });
      }
    });

    return map;
  });

  getContactMonthShare(contactId: number): number {
    return this.contactSharesMap().get(contactId) || 0;
  }

  isContactSettled(contactId: number): boolean {
    const selMonth = this.periodService.selectedMonthYear();
    // Chave padrão de liquidação para o contato em relação ao administrador (Neto ID 2)
    const key = `${selMonth}_${contactId}_2`;
    const status = this.settlementService.getSettlementStatus(key);
    return status?.settled === true;
  }

  toggleContactSettled(contact: Responsible): void {
    const selMonth = this.periodService.selectedMonthYear();
    const key = `${selMonth}_${contact.id}_2`;
    const current = this.settlementService.getSettlementStatus(key);
    const newStatus = !current?.settled;
    this.settlementService.saveSettlementStatus(key, newStatus);

    if (newStatus) {
      this.toastr.success(`Reembolso de ${contact.name} marcado como liquidado!`, 'Quitado');
    } else {
      this.toastr.info(`Reembolso de ${contact.name} reaberto.`, 'Pendente');
    }
  }

  openNewContactModal(): void {
    this.isEditing.set(false);
    this.editingContactId.set(null);
    this.formName.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.formPixKey.set('');
    this.formPixKeyType.set('PHONE');
    this.formColor.set('#6366F1');
    this.formNotes.set('');
    this.isContactModalOpen.set(true);
  }

  openEditContactModal(contact: Responsible): void {
    this.isEditing.set(true);
    this.editingContactId.set(contact.id);
    this.formName.set(contact.name);
    this.formPhone.set(this.responsibleService.formatPhone(contact.phone));
    this.formEmail.set(contact.email || '');
    this.formPixKey.set(contact.pixKey || '');
    this.formPixKeyType.set(contact.pixKeyType || 'PHONE');
    this.formColor.set(contact.color || '#6366F1');
    this.formNotes.set(contact.notes || '');
    this.isContactModalOpen.set(true);
  }

  closeContactModal(): void {
    this.isContactModalOpen.set(false);
    this.isEditing.set(false);
    this.editingContactId.set(null);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    this.formPhone.set(this.responsibleService.formatPhone(digits));
  }

  saveContact(): void {
    const name = this.formName().trim();
    const rawPhone = this.formPhone().replace(/\D/g, '');

    if (!name) {
      this.toastr.warning('Informe o nome da pessoa de rateio.', 'Atenção');
      return;
    }

    if (!rawPhone || rawPhone.length < 10) {
      this.toastr.warning('O número de celular é obrigatório com DDD (mínimo 10 dígitos) para notificações.', 'Campo Obrigatório');
      return;
    }

    try {
      if (this.isEditing() && this.editingContactId()) {
        const contact: Responsible = {
          id: this.editingContactId()!,
          name,
          phone: rawPhone,
          email: this.formEmail().trim() || undefined,
          pixKey: this.formPixKey().trim() || undefined,
          pixKeyType: this.formPixKeyType(),
          color: this.formColor(),
          notes: this.formNotes().trim() || undefined,
          active: true
        };
        this.responsibleService.updateResponsible(contact);
        this.toastr.success(`Contato "${name}" atualizado com sucesso!`, 'Atualizado');
      } else {
        this.responsibleService.addResponsible({
          name,
          phone: rawPhone,
          email: this.formEmail().trim() || undefined,
          pixKey: this.formPixKey().trim() || undefined,
          pixKeyType: this.formPixKeyType(),
          color: this.formColor(),
          notes: this.formNotes().trim() || undefined,
          active: true
        });
        this.toastr.success(`Contato de rateio "${name}" cadastrado!`, 'Criado');
      }

      this.closeContactModal();
    } catch (e: any) {
      this.toastr.error(e?.message || 'Erro ao salvar contato.', 'Erro');
    }
  }

  confirmDeleteContact(contact: Responsible): void {
    this.contactToDelete.set(contact);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteModalOpen.set(false);
    this.contactToDelete.set(null);
  }

  executeDeleteContact(): void {
    const c = this.contactToDelete();
    if (!c) {
      this.cancelDelete();
      return;
    }

    this.responsibleService.deleteResponsible(c.id);
    this.toastr.success(`Contato "${c.name}" removido com sucesso.`, 'Removido');
    this.cancelDelete();
  }

  openWhatsAppBilling(contact: Responsible): void {
    const due = this.getContactMonthShare(contact.id);
    if (due <= 0) {
      this.toastr.info(`Não há cota-parte pendente para ${contact.name} neste ciclo.`, 'Sem Pendências');
      return;
    }

    const cycleName = this.periodService.formattedMonthYear();
    const url = this.responsibleService.buildBillingWhatsAppUrl(contact, due, cycleName, this.adminPixKey());
    window.open(url, '_blank');
  }
}
