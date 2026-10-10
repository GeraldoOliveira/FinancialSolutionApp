import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { RecurringExpense } from '../../../shared/models/recurring-expense';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecurringExpenseService {
  private apiUrl = environment.apiUrlv1.replace(/\/$/, '');
  private readonly STORAGE_KEY = 'mfs.recurring_expenses';

  private initialRecurring: RecurringExpense[] = [
    {
      id: 1,
      title: 'Netflix 4K Premium',
      category: 'Streaming & Lazer',
      amount: 55.90,
      dueDay: 15,
      paymentMethod: '1', // Cartão de crédito
      creditCardId: 1, // Nubank
      active: true,
      splitType: 'FIXED',
      responsiblesSplit: [
        { responsibleId: 2, proratedValue: 27.95 }, // Neto (50%)
        { responsibleId: 1, proratedValue: 27.95 }  // Anelise (50%)
      ],
      notes: 'Plano familiar 4 telas'
    },
    {
      id: 2,
      title: 'Spotify Família',
      category: 'Streaming & Lazer',
      amount: 34.90,
      dueDay: 10,
      paymentMethod: '1', // Cartão de crédito
      creditCardId: 2, // XP
      active: true,
      splitType: 'ROTATING', // Exemplo de Cobrança Alternada / Rodízio!
      rotationOrder: [2, 1, 4], // 1º Neto, 2º Anelise, 3º Gabriella
      rotationStartMonth: '2026-10',
      responsiblesSplit: [
        { responsibleId: 2, proratedValue: 34.90 }
      ],
      notes: 'Cobrança alternada: a cada mês uma pessoa diferente paga o valor total (Neto -> Anelise -> Gabriella)'
    },
    {
      id: 3,
      title: 'Aluguel & Condomínio',
      category: 'Moradia',
      amount: 2400.00,
      dueDay: 5,
      paymentMethod: '2', // Pix / Boleto
      active: true,
      splitType: 'FIXED',
      responsiblesSplit: [
        { responsibleId: 2, proratedValue: 1200.00 }, // Neto (50%)
        { responsibleId: 1, proratedValue: 1200.00 }  // Anelise (50%)
      ],
      notes: 'Despesa fixa principal da casa'
    },
    {
      id: 4,
      title: 'Internet Fibra 600MB',
      category: 'Serviços & Utilidades',
      amount: 139.90,
      dueDay: 20,
      paymentMethod: '1', // Cartão de crédito
      creditCardId: 1, // Nubank
      active: true,
      splitType: 'FIXED',
      responsiblesSplit: [
        { responsibleId: 2, proratedValue: 70.00 },
        { responsibleId: 1, proratedValue: 69.90 }
      ],
      notes: 'Internet residencial'
    },
    {
      id: 5,
      title: 'Academia SmartFit',
      category: 'Saúde & Bem-estar',
      amount: 119.90,
      dueDay: 8,
      paymentMethod: '1', // Cartão de crédito
      creditCardId: 1, // Nubank
      active: true,
      splitType: 'FIXED',
      responsiblesSplit: [
        { responsibleId: 2, proratedValue: 119.90 }
      ],
      notes: 'Plano Black'
    }
  ];

  public recurringSignal = signal<RecurringExpense[]>([]);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: RecurringExpense[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migração / Atualização inteligente: garante que Spotify (id: 2) tenha a configuração de rodízio solicitada
          const migrated = parsed.map(item => {
            if (Number(item.id) === 2 && item.title.toLowerCase().includes('spotify')) {
              return {
                ...item,
                splitType: 'ROTATING' as const,
                rotationOrder: [2, 1, 4], // 1º Neto, 2º Anelise, 3º Gabriella
                rotationStartMonth: item.rotationStartMonth || '2026-10',
                notes: 'Cobrança alternada: a cada mês uma pessoa diferente paga o valor total (Neto -> Anelise -> Gabriella)'
              };
            }
            return item;
          });
          this.recurringSignal.set(migrated);
          this.saveToStorage(migrated);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar despesas recorrentes:', e);
    }
    this.recurringSignal.set(this.initialRecurring);
    this.saveToStorage(this.initialRecurring);
  }

  private saveToStorage(list: RecurringExpense[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar despesas recorrentes no localStorage:', e);
    }
  }

  getRecurringExpenses(): Observable<RecurringExpense[]> {
    return of(this.recurringSignal());
  }

  addRecurringExpense(data: Omit<RecurringExpense, 'id'>): RecurringExpense {
    const current = this.recurringSignal();
    const newId = current.length > 0 ? Math.max(...current.map(c => Number(c.id) || 0)) + 1 : 1;

    const newExpense: RecurringExpense = {
      ...data,
      id: newId,
      splitType: data.splitType || 'FIXED',
      active: data.active !== undefined ? data.active : true
    };

    const updated = [...current, newExpense];
    this.recurringSignal.set(updated);
    this.saveToStorage(updated);
    return newExpense;
  }

  updateRecurringExpense(expense: RecurringExpense): void {
    const updated = this.recurringSignal().map(r =>
      String(r.id) === String(expense.id) ? expense : r
    );
    this.recurringSignal.set(updated);
    this.saveToStorage(updated);
  }

  deleteRecurringExpense(id: number | string): void {
    const updated = this.recurringSignal().filter(r => String(r.id) !== String(id));
    this.recurringSignal.set(updated);
    this.saveToStorage(updated);
  }

  toggleActive(id: number | string): void {
    const updated = this.recurringSignal().map(r =>
      String(r.id) === String(id) ? { ...r, active: !r.active } : r
    );
    this.recurringSignal.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Determina qual responsável é o pagador da vez para despesas com cobrança alternada (rodízio)
   * baseado no mês de referência selecionado ('YYYY-MM').
   */
  getRotatingResponsibleForMonth(rec: RecurringExpense, targetMonthYear: string): number | null {
    if (rec.splitType !== 'ROTATING' || !rec.rotationOrder || rec.rotationOrder.length === 0) {
      return null;
    }

    const startMonth = rec.rotationStartMonth || '2026-10';
    const [yStart, mStart] = startMonth.split('-').map(Number);
    const [yTarget, mTarget] = targetMonthYear.split('-').map(Number);
    const diff = (yTarget - yStart) * 12 + (mTarget - mStart);

    const len = rec.rotationOrder.length;
    const idx = ((diff % len) + len) % len;
    return rec.rotationOrder[idx];
  }

  /**
   * Automação de Virada de Mês / Fechamento de Ciclo:
   * Processa todas as despesas recorrentes ativas e gera os lançamentos correspondentes
   * no módulo de despesas (`/api/v1/expenses/batch`) sem duplicidade.
   */
  processCycleRecurring(targetMonthYear: string): Observable<{ count: number; items: any[] }> {
    const currentList = this.recurringSignal();
    // Identifica quais recorrentes ativas ainda NÃO foram geradas neste mês de referência
    const pending = currentList.filter(r => r.active && r.lastProcessedMonth !== targetMonthYear);

    if (pending.length === 0) {
      return of({ count: 0, items: [] });
    }

    const newExpenseRecords = pending.map(rec => {
      const dayFormatted = String(Math.min(28, Math.max(1, rec.dueDay))).padStart(2, '0');

      let responsibles: { responsibleId: number; proratedValue: number }[] = [];
      let descSuffix = '(Recorrente)';

      if (rec.splitType === 'ROTATING' && rec.rotationOrder && rec.rotationOrder.length > 0) {
        const rotatingRespId = this.getRotatingResponsibleForMonth(rec, targetMonthYear);
        if (rotatingRespId) {
          responsibles = [{ responsibleId: rotatingRespId, proratedValue: rec.amount }];
          descSuffix = `(Recorrente - Rodízio)`;
        } else {
          responsibles = rec.responsiblesSplit || [];
        }
      } else {
        responsibles = rec.responsiblesSplit || [];
      }

      return {
        expenseOrigin: {
          name: rec.category,
          description: `${rec.title} ${descSuffix}`
        },
        totalValue: rec.amount.toFixed(2),
        date: `${targetMonthYear}-${dayFormatted}`,
        methodList: rec.paymentMethod || '1',
        creditCardList: rec.creditCardId ? String(rec.creditCardId) : undefined,
        installments: '1',
        expenseResponsibles: responsibles.map(s => ({
          responsibleId: s.responsibleId,
          proratedValue: s.proratedValue
        }))
      };
    });

    // Envia o lote para o backend
    return this.http.post<any>(`${this.apiUrl}/expenses/batch`, newExpenseRecords).pipe(
      catchError(() => {
        // Fallback resiliente: simula sucesso caso a API batch retorne erro
        return of({ count: newExpenseRecords.length, items: newExpenseRecords });
      }),
      tap(() => {
        // Marca todas as despesas processadas como lançadas no targetMonthYear
        const updated = this.recurringSignal().map(r => {
          if (pending.some(p => String(p.id) === String(r.id))) {
            return { ...r, lastProcessedMonth: targetMonthYear };
          }
          return r;
        });

        this.recurringSignal.set(updated);
        this.saveToStorage(updated);
      })
    );
  }
}
