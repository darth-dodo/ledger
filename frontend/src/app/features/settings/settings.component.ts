import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, CURRENCIES, CurrencyOption } from '../../core/services/settings.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-lg">
      <h2 class="text-2xl font-bold mb-6">Settings</h2>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-base">Currency</h3>
          <p class="text-sm text-base-content/60 mb-3">
            Choose the currency used when displaying financial amounts in chat responses.
          </p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            @for (c of currencies; track c.code) {
              <button
                class="btn btn-sm justify-start gap-2"
                [class.btn-primary]="c.code === selectedCurrency"
                [class.btn-ghost]="c.code !== selectedCurrency"
                (click)="selectCurrency(c.code)"
              >
                <span class="text-lg">{{ c.symbol }}</span>
                <span class="text-xs">{{ c.code }}</span>
              </button>
            }
          </div>

          <div class="mt-4 text-xs text-base-content/40">
            Currently set to <strong>{{ selectedCurrencyName }}</strong>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 border border-error/30 mt-6">
        <div class="card-body">
          <h3 class="card-title text-base text-error">Danger Zone</h3>
          <p class="text-sm text-base-content/60 mb-3">
            Permanently delete all statements, transactions, chat sessions, and embeddings. This
            action cannot be undone.
          </p>

          @if (!confirmPurge) {
            <button
              class="btn btn-error btn-sm w-fit"
              [disabled]="purging"
              (click)="confirmPurge = true"
            >
              Purge All Data
            </button>
          } @else {
            <div class="flex items-center gap-2">
              <button class="btn btn-error btn-sm" [disabled]="purging" (click)="purge()">
                @if (purging) {
                  <span class="loading loading-spinner loading-sm"></span>
                } @else {
                  Confirm Purge
                }
              </button>
              <button
                class="btn btn-ghost btn-sm"
                [disabled]="purging"
                (click)="confirmPurge = false"
              >
                Cancel
              </button>
            </div>
          }

          @if (purgeMessage) {
            <div
              class="text-sm mt-2"
              [class.text-success]="purgeSuccess"
              [class.text-error]="!purgeSuccess"
            >
              {{ purgeMessage }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly apiService = inject(ApiService);

  currencies: CurrencyOption[] = CURRENCIES;
  selectedCurrency: string = this.settingsService.currency;

  confirmPurge = false;
  purging = false;
  purgeMessage = '';
  purgeSuccess = false;

  get selectedCurrencyName(): string {
    return (
      this.currencies.find((c) => c.code === this.selectedCurrency)?.name ?? this.selectedCurrency
    );
  }

  selectCurrency(code: string): void {
    this.selectedCurrency = code;
    this.settingsService.setCurrency(code);
  }

  purge(): void {
    this.purging = true;
    this.purgeMessage = '';
    this.apiService.purgeAll().subscribe({
      next: () => {
        this.purging = false;
        this.confirmPurge = false;
        this.purgeSuccess = true;
        this.purgeMessage = 'All data purged successfully.';
      },
      error: () => {
        this.purging = false;
        this.purgeSuccess = false;
        this.purgeMessage = 'Failed to purge data. Please try again.';
      },
    });
  }
}
