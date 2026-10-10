import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Budget } from '../../../shared/models/budget';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private apiUrl = `${environment.apiUrlv1.replace(/\/$/, '')}/budgets`;

  public budgetsSignal = signal<Budget[]>([]);

  constructor(private http: HttpClient) {}

  getBudgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(this.apiUrl).pipe(
      tap(budgets => this.budgetsSignal.set(budgets))
    );
  }

  addBudget(budget: Budget): Observable<Budget> {
    return this.http.post<Budget>(this.apiUrl, budget).pipe(
      tap(saved => this.budgetsSignal.update(list => [...list, saved]))
    );
  }

  updateBudget(id: number, budget: Partial<Budget>): Observable<Budget> {
    return this.http.put<Budget>(`${this.apiUrl}/${id}`, budget).pipe(
      tap(updated => this.budgetsSignal.update(list => list.map(item => item.id === id ? updated : item)))
    );
  }

  deleteBudget(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.budgetsSignal.update(list => list.filter(item => item.id !== id)))
    );
  }
}
