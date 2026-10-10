import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RawBankTransaction } from '../../../shared/utils/bank-statement-parser';

export interface ClassifiedTransaction {
  id: number;
  originalDescription: string;
  establishment: string;
  description: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  date: string;
  category: string;
  paymentMethod: string;
  selected: boolean;
  suggestedResponsibles: { responsibleId: number; proratedValue: number }[];
}

export interface ClassifyResponse {
  total: number;
  items: ClassifiedTransaction[];
}

export interface BatchImportResponse {
  message: string;
  count: number;
  items: unknown[];
}

@Injectable({
  providedIn: 'root'
})
export class StatementImportService {
  private baseApi = environment.apiUrlv1.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  classifyTransactions(transactions: RawBankTransaction[]): Observable<ClassifyResponse> {
    return this.http.post<ClassifyResponse>(`${this.baseApi}/ai/classify-statement`, { transactions });
  }

  importExpensesBatch(expenses: unknown[]): Observable<BatchImportResponse> {
    return this.http.post<BatchImportResponse>(`${this.baseApi}/expenses/batch`, { expenses });
  }

  importIncomesBatch(incomes: unknown[]): Observable<BatchImportResponse> {
    return this.http.post<BatchImportResponse>(`${this.baseApi}/incomes/batch`, { incomes });
  }
}
