import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'upload',
    loadComponent: () =>
      import('./features/upload/upload.component').then(
        (m) => m.UploadComponent,
      ),
  },
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  // Future routes:
  // { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
  // { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },
  // { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
];
