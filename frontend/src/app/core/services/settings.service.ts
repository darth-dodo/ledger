import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

const STORAGE_KEY = 'ledger_currency';
const DEFAULT_CURRENCY = 'USD';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly currency$ = new BehaviorSubject<string>(this.loadCurrency());

  get currency(): string {
    return this.currency$.value;
  }

  get currencyChanges(): Observable<string> {
    return this.currency$.asObservable();
  }

  setCurrency(code: string): void {
    localStorage.setItem(STORAGE_KEY, code);
    this.currency$.next(code);
  }

  private loadCurrency(): string {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY;
  }
}
