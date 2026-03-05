import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TransactionsService,
  Transaction,
  TransactionFilters,
} from '../../core/services/transactions.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl">
      <h2 class="text-2xl font-semibold mb-1">Transactions</h2>
      <p class="text-base-content/60 mb-6">Browse and filter your parsed transactions.</p>

      <!-- Filters -->
      <div class="card bg-base-100 border border-base-300 mb-4">
        <div class="card-body p-4 gap-3">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="startDate">
                <span class="label-text text-xs uppercase tracking-wide">From</span>
              </label>
              <input
                id="startDate"
                type="date"
                class="input input-bordered input-sm"
                [(ngModel)]="filters.startDate"
                (change)="applyFilters()"
              />
            </div>
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="endDate">
                <span class="label-text text-xs uppercase tracking-wide">To</span>
              </label>
              <input
                id="endDate"
                type="date"
                class="input input-bordered input-sm"
                [(ngModel)]="filters.endDate"
                (change)="applyFilters()"
              />
            </div>
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="category">
                <span class="label-text text-xs uppercase tracking-wide">Category</span>
              </label>
              <select id="category" class="select select-bordered select-sm" [(ngModel)]="filters.category" (change)="applyFilters()">
                <option value="">All</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat | titlecase }}</option>
                }
              </select>
            </div>
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="type">
                <span class="label-text text-xs uppercase tracking-wide">Type</span>
              </label>
              <select id="type" class="select select-bordered select-sm" [(ngModel)]="filterType" (change)="applyFilters()">
                <option value="">All</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>
          <div class="flex flex-wrap gap-3 items-end">
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="minAmount">
                <span class="label-text text-xs uppercase tracking-wide">Min Amount</span>
              </label>
              <input
                id="minAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="input input-bordered input-sm"
                [(ngModel)]="filterMinAmount"
                (change)="applyFilters()"
              />
            </div>
            <div class="form-control flex-1 min-w-[140px]">
              <label class="label py-0 pb-1" for="maxAmount">
                <span class="label-text text-xs uppercase tracking-wide">Max Amount</span>
              </label>
              <input
                id="maxAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="input input-bordered input-sm"
                [(ngModel)]="filterMaxAmount"
                (change)="applyFilters()"
              />
            </div>
            <div class="flex items-end pb-px">
              <button class="btn btn-ghost btn-sm" (click)="clearFilters()">Clear Filters</button>
            </div>
          </div>
        </div>
      </div>

      @if (isLoading) {
        <div class="alert alert-info mt-4">
          <span class="loading loading-spinner loading-sm"></span>
          <span>Loading transactions...</span>
        </div>
      }

      @if (errorMessage) {
        <div role="alert" class="alert alert-error mt-4">
          <span>{{ errorMessage }}</span>
        </div>
      }

      @if (!isLoading && !errorMessage) {
        <p class="text-sm text-base-content/50 mb-2">
          {{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }}
        </p>

        @if (transactions.length > 0) {
          <div class="overflow-x-auto rounded-lg border border-base-300">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                  <th>Type</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                @for (txn of transactions; track txn.id) {
                  <tr class="hover">
                    <td class="whitespace-nowrap tabular-nums">{{ formatDate(txn.date) }}</td>
                    <td class="max-w-[280px] truncate">{{ txn.description }}</td>
                    <td class="text-right font-semibold tabular-nums whitespace-nowrap"
                        [class.text-success]="txn.type === 'credit'"
                        [class.text-error]="txn.type === 'debit'">
                      {{ txn.type === 'credit' ? '+' : '-' }}{{ formatAmount(txn.amount) }}
                    </td>
                    <td>
                      <span class="badge badge-sm font-semibold"
                            [class.badge-success]="txn.type === 'credit'"
                            [class.badge-error]="txn.type === 'debit'">
                        {{ txn.type | titlecase }}
                      </span>
                    </td>
                    <td>
                      @if (editingCategoryId === txn.id) {
                        <select
                          [ngModel]="txn.category ?? ''"
                          (ngModelChange)="saveCategory(txn, $event)"
                          (blur)="cancelCategoryEdit()"
                          class="select select-bordered select-xs"
                          #categorySelect
                        >
                          <option value="">None</option>
                          @for (cat of categories; track cat) {
                            <option [value]="cat">{{ cat | titlecase }}</option>
                          }
                        </select>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer
                                 transition-colors hover:bg-primary/10 focus-visible:outline-2
                                 focus-visible:outline-primary focus-visible:outline-offset-2"
                          (click)="startCategoryEdit(txn.id)"
                          role="button"
                          tabindex="0"
                          (keydown.enter)="startCategoryEdit(txn.id)"
                          (keydown.space)="startCategoryEdit(txn.id); $event.preventDefault()"
                          [attr.aria-label]="'Edit category: ' + (txn.category ?? 'None')"
                        >
                          {{ txn.category ? (txn.category | titlecase) : 'Uncategorized' }}
                          <span class="text-xs text-base-content/30 opacity-0 group-hover:opacity-100 transition-opacity edit-hint" aria-hidden="true">&#9998;</span>
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body items-center text-center py-12">
              <p class="text-base-content/60 text-sm">No transactions found. Try adjusting your filters or upload a statement first.</p>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host .edit-hint {
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      :host span:hover .edit-hint {
        opacity: 1;
      }

      @media (max-width: 640px) {
        :host .form-control {
          min-width: 100% !important;
        }
      }
    `,
  ],
})
export class TransactionsComponent {
  private readonly transactionsService = inject(TransactionsService);

  transactions: Transaction[] = [];
  isLoading = false;
  errorMessage = '';
  editingCategoryId = '';

  filters: TransactionFilters = {};
  filterType = '';
  filterMinAmount: number | null = null;
  filterMaxAmount: number | null = null;

  categories = [
    'groceries',
    'dining',
    'transport',
    'utilities',
    'entertainment',
    'shopping',
    'health',
    'education',
    'travel',
    'income',
    'transfer',
    'other',
  ];

  ngOnInit(): void {
    this.loadTransactions();
  }

  applyFilters(): void {
    this.loadTransactions();
  }

  clearFilters(): void {
    this.filters = {};
    this.filterType = '';
    this.filterMinAmount = null;
    this.filterMaxAmount = null;
    this.loadTransactions();
  }

  startCategoryEdit(id: string): void {
    this.editingCategoryId = id;
    setTimeout(() => {
      const select = document.querySelector('.category-edit') as HTMLSelectElement | null;
      select?.focus();
    });
  }

  cancelCategoryEdit(): void {
    this.editingCategoryId = '';
  }

  saveCategory(txn: Transaction, value: string): void {
    const category = value || null;
    this.editingCategoryId = '';

    this.transactionsService
      .updateTransaction(txn.id, { category: category ?? undefined })
      .subscribe({
        next: (updated) => {
          const idx = this.transactions.findIndex((t) => t.id === txn.id);
          if (idx !== -1) {
            this.transactions[idx] = updated;
          }
        },
        error: () => {
          // Revert silently on failure; the original value is still displayed
        },
      });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatAmount(amount: number): string {
    return Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private loadTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: TransactionFilters = { ...this.filters };
    if (this.filterType) {
      params.type = this.filterType as 'debit' | 'credit';
    }
    if (this.filterMinAmount != null && this.filterMinAmount > 0) {
      params.minAmount = this.filterMinAmount;
    }
    if (this.filterMaxAmount != null && this.filterMaxAmount > 0) {
      params.maxAmount = this.filterMaxAmount;
    }

    this.transactionsService.getTransactions(params).subscribe({
      next: (data) => {
        this.transactions = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message ?? 'Failed to load transactions.';
      },
    });
  }
}
