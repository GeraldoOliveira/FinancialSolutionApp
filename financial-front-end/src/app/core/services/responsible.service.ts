import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Responsible } from '../../shared/models/responsible';

@Injectable({
  providedIn: 'root'
})
export class ResponsibleService {
  private readonly STORAGE_KEY = 'mfs.responsibles';

  private initialResponsibles: Responsible[] = [
    {
      id: 1,
      name: 'Anelise',
      phone: '11999990001',
      color: '#EC4899',
      pixKey: 'anelise.familia@gmail.com',
      pixKeyType: 'EMAIL',
      city: 'SAO PAULO',
      active: true,
      notes: 'Rateio padrão de casa'
    },
    {
      id: 2,
      name: 'Neto',
      phone: '11999990002',
      color: '#3B82F6',
      pixKey: '11999990002',
      pixKeyType: 'PHONE',
      city: 'SAO PAULO',
      active: true,
      notes: 'Administrador / Pagador das Faturas'
    },
    {
      id: 3,
      name: 'Yah',
      phone: '11999990003',
      color: '#10B981',
      pixKey: 'yah.pagamentos@gmail.com',
      pixKeyType: 'EMAIL',
      city: 'SAO PAULO',
      active: true,
      notes: 'Rateio de streaming e mercado'
    },
    {
      id: 4,
      name: 'Gabriella',
      phone: '11999990004',
      color: '#8B5CF6',
      pixKey: 'gabriella.pix@gmail.com',
      pixKeyType: 'EMAIL',
      city: 'SAO PAULO',
      active: true,
      notes: 'Contato de rateio e rodízio'
    }
  ];

  public responsiblesSignal = signal<Responsible[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: Responsible[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garante que contatos essenciais (como Gabriella) estejam presentes
          const missingInitial = this.initialResponsibles.filter(
            init => !parsed.some(p => p.name.toLowerCase() === init.name.toLowerCase() || p.id === init.id)
          );
          const fullList = [...parsed, ...missingInitial];
          this.responsiblesSignal.set(fullList);
          this.saveToStorage(fullList);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar contatos de rateio do storage:', e);
    }
    this.responsiblesSignal.set(this.initialResponsibles);
    this.saveToStorage(this.initialResponsibles);
  }

  private saveToStorage(list: Responsible[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar contatos no localStorage:', e);
    }
  }

  getResponsibles(): Observable<Responsible[]> {
    return of(this.responsiblesSignal());
  }

  getResponsibleById(id: number | string): Responsible | undefined {
    return this.responsiblesSignal().find(r => String(r.id) === String(id));
  }

  getResponsibleName(id: number | string): string {
    const found = this.getResponsibleById(id);
    return found ? found.name : `Contato #${id}`;
  }

  addResponsible(data: Omit<Responsible, 'id'>): Responsible {
    const cleanPhone = (data.phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Celular obrigatório com DDD válido para contato de rateio.');
    }

    const current = this.responsiblesSignal();
    const newId = current.length > 0 ? Math.max(...current.map(c => Number(c.id) || 0)) + 1 : 1;

    const newContact: Responsible = {
      ...data,
      id: newId,
      phone: cleanPhone,
      active: data.active !== undefined ? data.active : true,
      color: data.color || '#6366F1'
    };

    const updated = [...current, newContact];
    this.responsiblesSignal.set(updated);
    this.saveToStorage(updated);
    return newContact;
  }

  updateResponsible(contact: Responsible): void {
    const cleanPhone = (contact.phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Celular obrigatório com DDD válido.');
    }

    const sanitized: Responsible = {
      ...contact,
      phone: cleanPhone
    };

    const updated = this.responsiblesSignal().map(r =>
      String(r.id) === String(sanitized.id) ? sanitized : r
    );

    this.responsiblesSignal.set(updated);
    this.saveToStorage(updated);
  }

  deleteResponsible(id: number | string): void {
    const updated = this.responsiblesSignal().filter(r => String(r.id) !== String(id));
    this.responsiblesSignal.set(updated);
    this.saveToStorage(updated);
  }

  updatePixKey(id: number, pixKey: string, pixKeyType: 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM'): void {
    const updated = this.responsiblesSignal().map(r =>
      r.id === id ? { ...r, pixKey, pixKeyType } : r
    );
    this.responsiblesSignal.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Formata telefone para exibição: (11) 99999-9999
   */
  formatPhone(raw: string): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return raw;
  }

  /**
   * Constrói mensagem de cobrança formatada pronta para envio no WhatsApp
   */
  buildBillingWhatsAppUrl(contact: Responsible, amountDue: number, cycleMonthName: string, adminPixKey?: string): string {
    const cleanPhone = (contact.phone || '').replace(/\D/g, '');
    const internationalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const formattedAmount = amountDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let message = `Olá *${contact.name}*! 👋\n\n`;
    message += `Segue o fechamento da sua parte no rateio do cartão/despesas de *${cycleMonthName}*:\n`;
    message += `💰 *Valor para reembolso:* ${formattedAmount}\n\n`;
    message += `Como as contas foram quitadas integralmente, você pode transferir o reembolso via PIX:\n`;

    if (adminPixKey) {
      message += `🔑 *Chave PIX:* ${adminPixKey}\n`;
    }

    message += `\nQualquer dúvida sobre as despesas divididas, me avise! Obrigado! 🚀`;

    return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
  }
}
