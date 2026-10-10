import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Income } from '../../../shared/models/income';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private apiUrl = `${environment.apiUrlv1.replace(/\/$/, '')}/incomes`;

  public incomesSignal = signal<Income[]>([]);

  constructor(private http: HttpClient) {}

  getIncomes(): Observable<Income[]> {
    return this.http.get<Income[]>(this.apiUrl).pipe(
      tap(incomes => this.incomesSignal.set(incomes))
    );
  }

  addIncome(income: Income): Observable<Income> {
    return this.http.post<Income>(this.apiUrl, income).pipe(
      tap(saved => this.incomesSignal.update(list => [saved, ...list]))
    );
  }

  updateIncome(id: number, income: Partial<Income>): Observable<Income> {
    return this.http.put<Income>(`${this.apiUrl}/${id}`, income).pipe(
      tap(updated => this.incomesSignal.update(list => list.map(item => item.id === id ? updated : item)))
    );
  }

  deleteIncome(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.incomesSignal.update(list => list.filter(item => item.id !== id)))
    );
  }
}
