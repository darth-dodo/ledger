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
        <a
          routerLink="/settings"
          routerLinkActive="active"
          class="btn btn-ghost btn-sm text-neutral-content/60 hover:text-neutral-content ml-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </a>
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
