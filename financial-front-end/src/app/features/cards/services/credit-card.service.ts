import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { CreditCard, CreditCardInvoice } from '../../../shared/models/credit-card';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CreditCardService {
  private apiUrl = environment.apiUrlv1.replace(/\/$/, '');
  private readonly STORAGE_KEY = 'mfs.credit_cards';
  private readonly DELETED_KEY = 'mfs.deleted_card_ids';

  public cardsSignal = signal<CreditCard[]>([]);
  public invoicesSignal = signal<CreditCardInvoice[]>([]);

  constructor(private http: HttpClient) {}

  private getLocalCards(): CreditCard[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalCards(cards: CreditCard[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.warn('Falha ao salvar cartões no localStorage:', e);
    }
  }

  private getDeletedCardIds(): string[] {
    try {
      const raw = localStorage.getItem(this.DELETED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private addDeletedCardId(id: number | string): void {
    try {
      const list = this.getDeletedCardIds();
      const strId = String(id);
      if (!list.includes(strId)) {
        list.push(strId);
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Falha ao registrar cartão excluído:', e);
    }
  }

  private removeDeletedCardId(id: number | string): void {
    try {
      const list = this.getDeletedCardIds().filter(i => i !== String(id));
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Falha ao atualizar lista de excluídos:', e);
    }
  }

  getCreditCards(): Observable<CreditCard[]> {
    const deletedIds = this.getDeletedCardIds();

    return this.http.get<CreditCard[]>(`${this.apiUrl}/credit-cards`).pipe(
      catchError(() => {
        // Tenta rota json-server em db.json (/creditCards)
        return this.http.get<CreditCard[]>(`${this.apiUrl}/creditCards`).pipe(
          catchError(() => of([]))
        );
      }),
      tap(serverCards => {
        const localCards = this.getLocalCards();
        let merged = [...(serverCards || [])];

        // Mescla cartões locais sem duplicar
        localCards.forEach(l => {
          if (!merged.some(m => String(m.id) === String(l.id) || (m.name === l.name && m.lastDigits === l.lastDigits))) {
            merged.push(l);
          }
        });

        // Filtra expressamente qualquer cartão excluído pelo usuário
        merged = merged.filter(c => c.id !== undefined && !deletedIds.includes(String(c.id)));

        // Se ainda estiver vazio e o usuário NUNCA tiver excluído cartões, preenche com os iniciais
        if (merged.length === 0 && deletedIds.length === 0) {
          merged.push(
            {
              id: 1,
              name: 'Nubank Ultravioleta',
              bank: 'Nubank',
              lastDigits: '4195',
              color: '#820AD1',
              totalLimit: 25000,
              availableLimit: 18450,
              closingDay: 28,
              dueDay: 5,
              paymentDays: 38
            },
            {
              id: 2,
              name: 'XP Visa Infinite',
              bank: 'XP Investimentos',
              lastDigits: '8821',
              color: '#1E293B',
              totalLimit: 30000,
              availableLimit: 26200,
              closingDay: 20,
              dueDay: 28,
              paymentDays: 39
            }
          );
        }

        this.cardsSignal.set(merged);
      })
    );
  }

  addCreditCard(card: CreditCard): Observable<CreditCard> {
    return this.http.post<CreditCard>(`${this.apiUrl}/credit-cards`, card).pipe(
      catchError(() => {
        // Fallback 1: rota direta db.json
        return this.http.post<CreditCard>(`${this.apiUrl}/creditCards`, card).pipe(
          catchError(() => {
            // Fallback 2: persistência local resiliente à prova de falhas (404/500)
            const localCard: CreditCard = {
              ...card,
              id: card.id || Date.now(),
              availableLimit: card.availableLimit !== undefined ? card.availableLimit : card.totalLimit
            };
            return of(localCard);
          })
        );
      }),
      tap(saved => {
        if (saved.id !== undefined) {
          this.removeDeletedCardId(saved.id);
        }

        // Persiste localmente e atualiza signal reativo
        const currentLocal = this.getLocalCards().filter(c => String(c.id) !== String(saved.id));
        currentLocal.push(saved);
        this.saveLocalCards(currentLocal);

        this.cardsSignal.update(cards => {
          const filtered = cards.filter(c => String(c.id) !== String(saved.id));
          return [...filtered, saved];
        });
      })
    );
  }

  updateCreditCard(card: CreditCard): Observable<CreditCard> {
    const cardId = card.id;
    return this.http.put<CreditCard>(`${this.apiUrl}/credit-cards/${cardId}`, card).pipe(
      catchError(() => {
        // Fallback 1: rota direta db.json
        return this.http.put<CreditCard>(`${this.apiUrl}/creditCards/${cardId}`, card).pipe(
          catchError(() => {
            // Fallback 2: persistência local resiliente
            return of(card);
          })
        );
      }),
      tap(updated => {
        if (updated.id !== undefined) {
          this.removeDeletedCardId(updated.id);
        }

        // Atualiza no localStorage
        const local = this.getLocalCards();
        const idx = local.findIndex(c => String(c.id) === String(updated.id));
        if (idx !== -1) {
          local[idx] = updated;
        } else {
          local.push(updated);
        }
        this.saveLocalCards(local);

        // Atualiza signal reativo
        this.cardsSignal.update(cards =>
          cards.map(c => String(c.id) === String(updated.id) ? updated : c)
        );
      })
    );
  }

  deleteCreditCardLocally(id: number | string): void {
    const strId = String(id);
    this.addDeletedCardId(strId);

    // Remove do localStorage
    const local = this.getLocalCards().filter(c => String(c.id) !== strId);
    this.saveLocalCards(local);

    // Remove do signal reativo
    this.cardsSignal.update(cards => cards.filter(c => String(c.id) !== strId));
  }

  deleteCreditCard(id: number | string): Observable<boolean> {
    const strId = String(id);
    this.deleteCreditCardLocally(strId);

    return this.http.delete(`${this.apiUrl}/credit-cards/${strId}`).pipe(
      catchError(() => {
        // Fallback 1: rota direta db.json
        return this.http.delete(`${this.apiUrl}/creditCards/${strId}`).pipe(
          catchError(() => of(true))
        );
      }),
      map(() => true),
      catchError(() => of(true))
    );
  }

  getInvoices(): Observable<CreditCardInvoice[]> {
    return this.http.get<CreditCardInvoice[]>(`${this.apiUrl}/invoices`).pipe(
      catchError(() => {
        return of([
          {
            id: 1,
            cardId: 1,
            monthYear: '2026-10',
            closingDate: '2026-10-28',
            dueDate: '2026-11-05',
            totalAmount: 6550,
            status: 'ABERTA' as const,
            responsibleTotals: [
              { responsibleId: 1, amount: 2500 },
              { responsibleId: 2, amount: 3200 },
              { responsibleId: 3, amount: 850 }
            ]
          },
          {
            id: 2,
            cardId: 2,
            monthYear: '2026-10',
            closingDate: '2026-10-20',
            dueDate: '2026-10-28',
            totalAmount: 3800,
            status: 'ABERTA' as const,
            responsibleTotals: [
              { responsibleId: 1, amount: 1800 },
              { responsibleId: 2, amount: 2000 }
            ]
          }
        ]);
      }),
      tap(invoices => this.invoicesSignal.set(invoices))
    );
  }

  getCardById(id: number | string): CreditCard | undefined {
    return this.cardsSignal().find(c => String(c.id) === String(id));
  }
}
