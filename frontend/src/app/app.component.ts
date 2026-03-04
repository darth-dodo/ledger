import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="app-header">
      <h1>Ledger</h1>
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
      }

      .app-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.02em;
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
