import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <h1>Ledger</h1>
      <nav>
        <a routerLink="/upload" routerLinkActive="active">Upload</a>
      </nav>
    </header>
    <main class="app-main">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .app-header {
        padding: 1rem 2rem;
        background-color: #1a1a2e;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .app-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      nav {
        display: flex;
        gap: 1rem;
      }

      nav a {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: color 0.15s ease;
      }

      nav a:hover,
      nav a.active {
        color: #ffffff;
      }

      .app-main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
    `,
  ],
})
export class AppComponent {
  title = 'Ledger';
}
