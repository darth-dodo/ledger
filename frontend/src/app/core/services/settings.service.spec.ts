import { TestBed } from '@angular/core/testing';
import { SettingsService, CURRENCIES } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    localStorage.removeItem('ledger_currency');
  });

  it('should default to USD when localStorage is empty', () => {
    expect(service.currency).toBe('USD');
  });

  it('should return currency from localStorage when set', () => {
    localStorage.setItem('ledger_currency', 'EUR');
    // Need a fresh instance to pick up the stored value
    const freshService = new SettingsService();
    expect(freshService.currency).toBe('EUR');
  });

  it('should update current value when setCurrency is called', () => {
    service.setCurrency('GBP');
    expect(service.currency).toBe('GBP');
  });

  it('should write to localStorage when setCurrency is called', () => {
    service.setCurrency('INR');
    expect(localStorage.getItem('ledger_currency')).toBe('INR');
  });

  it('should emit on currencyChanges when currency changes', () => {
    const emitted: string[] = [];
    service.currencyChanges.subscribe((val) => emitted.push(val));

    service.setCurrency('JPY');
    service.setCurrency('CAD');

    // BehaviorSubject emits current value on subscribe, then subsequent changes
    expect(emitted).toEqual(['USD', 'JPY', 'CAD']);
  });

  it('should have expected entries in CURRENCIES array', () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF']);
  });

  it('should have 8 currency options', () => {
    expect(CURRENCIES).toHaveLength(8);
  });

  it('should include symbol and name for each currency', () => {
    for (const currency of CURRENCIES) {
      expect(currency.code).toBeTruthy();
      expect(currency.symbol).toBeTruthy();
      expect(currency.name).toBeTruthy();
    }
  });
});
