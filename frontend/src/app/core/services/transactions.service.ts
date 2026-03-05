import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  id: string;
  statementId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string | null;
}

export interface TransactionFilters {
  statementId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: 'debit' | 'credit';
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  getTransactions(filters?: TransactionFilters): Observable<Transaction[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.statementId) params = params.set('statementId', filters.statementId);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.minAmount != null) params = params.set('minAmount', filters.minAmount.toString());
      if (filters.maxAmount != null) params = params.set('maxAmount', filters.maxAmount.toString());
      if (filters.type) params = params.set('type', filters.type);
    }

    return this.http.get<Transaction[]>(`${this.baseUrl}/transactions`, { params });
  }

  updateTransaction(
    id: string,
    updates: { category?: string; description?: string },
  ): Observable<Transaction> {
    return this.http.patch<Transaction>(`${this.baseUrl}/transactions/${id}`, updates);
  }
}
