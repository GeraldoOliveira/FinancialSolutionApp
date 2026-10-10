import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiReceiptSplit {
  responsibleId: number;
  name: string;
  proratedValue: string;
}

export interface AiReceiptAnalysisData {
  establishment: string;
  description: string;
  originalTotal?: number;
  originalTotalFormatted?: string;
  installmentAmount?: number;
  installmentAmountFormatted?: string;
  totalValue: number;
  totalValueFormatted: string;
  date: string;
  paymentMethod: string;
  paymentMethodName: string;
  creditCardLastDigits?: string | null;
  installments?: number;
  category: string;
  suggestedSplit: AiReceiptSplit[];
  confidence: number;
}

export interface AiReceiptResponse {
  success: boolean;
  provider: string;
  data: AiReceiptAnalysisData;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptAiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrlv1}ai/analyze-receipt`;

  analyzeReceipt(imageBase64: string, fileName: string = 'comprovante.jpg', geminiApiKey?: string): Observable<AiReceiptResponse> {
    const key = geminiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || undefined : undefined);
    return this.http.post<AiReceiptResponse>(this.apiUrl, {
      imageBase64,
      fileName,
      geminiApiKey: key
    });
  }
}
