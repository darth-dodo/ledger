import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="navbar bg-neutral text-neutral-content px-4 sm:px-8">
      <div class="flex-none">
        <h1 class="text-xl font-semibold tracking-tight">Ledger</h1>
      </div>
      <nav class="flex gap-1 ml-8">
        <a
          routerLink="/upload"
          routerLinkActive="active"
          class="btn btn-ghost btn-sm text-neutral-content/60 hover:text-neutral-content"
          >Upload</a
        >
        <a
          routerLink="/transactions"
          routerLinkActive="active"
          class="btn btn-ghost btn-sm text-neutral-content/60 hover:text-neutral-content"
          >Transactions</a
        >
        <a
          routerLink="/chat"
          routerLinkActive="active"
          class="btn btn-ghost btn-sm text-neutral-content/60 hover:text-neutral-content"
          >Chat</a
        >
      </nav>
    </div>
    <main class="max-w-6xl mx-auto p-4 sm:p-8">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      :host a.active {
        color: oklch(var(--nc));
        opacity: 1;
      }
    `,
  ],
})
export class AppComponent {
  title = 'Ledger';
}
