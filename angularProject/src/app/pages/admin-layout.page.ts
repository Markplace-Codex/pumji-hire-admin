import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside>
        <h2>Super Admin</h2>
        <a routerLink="/orders" routerLinkActive="active">Orders</a>
        <a routerLink="/credits" routerLinkActive="active">Credits (Add/Edit)</a>
        <a routerLink="/customers" routerLinkActive="active">Customers</a>
        <a routerLink="/interview-schedules" routerLinkActive="active">Interview Schedules</a>
        <a routerLink="/contract-requests" routerLinkActive="active">Contract Requests</a>
        <a routerLink="/contact-us-requests" routerLinkActive="active">Contact Us Requests</a>
      </aside>

      <main>
        <header>
          <p>{{ pageTitle() }}</p>
          <button (click)="logout()">Logout</button>
        </header>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout { min-height: 100vh; display: grid; grid-template-columns: 260px 1fr; }
    aside { background: #0f172a; color: #fff; padding: 1.25rem; display: grid; align-content: start; gap: .55rem; }
    aside a { color: #cbd5e1; text-decoration: none; padding: .55rem .7rem; border-radius: 8px; }
    aside a.active, aside a:hover { background: #1e293b; color: #fff; }
    main { background: #f8fafc; }
    header { display:flex; justify-content: space-between; align-items:center; padding:1rem 1.25rem; background:#fff; border-bottom:1px solid #e2e8f0; }
    button { border: 1px solid #cbd5e1; background:#fff; border-radius: 8px; padding: .4rem .7rem; cursor:pointer; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } aside { grid-auto-flow: column; overflow:auto; } }
  `]
})
export class AdminLayoutPage {
  readonly pageTitle = computed(() => {
    const url = this.router.url;
    return url.replace('/', '').replaceAll('-', ' ').toUpperCase() || 'DASHBOARD';
  });

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
