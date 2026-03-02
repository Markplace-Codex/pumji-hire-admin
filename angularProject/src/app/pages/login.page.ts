import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-shell">
      <form class="login-card" (ngSubmit)="submit()">
        <h1>Super Admin Login</h1>
        <p>Use <strong>superadmin</strong> / <strong>admin@123</strong></p>

        <label>
          Username
          <input name="username" [(ngModel)]="username" placeholder="superadmin" required />
        </label>

        <label>
          Password
          <input name="password" type="password" [(ngModel)]="password" required />
        </label>

        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
        <button type="submit">Login</button>
      </form>
    </div>
  `,
  styles: [`
    .login-shell { min-height: 100vh; display: grid; place-items: center; background: #f3f5fb; }
    .login-card { width: min(420px, 92vw); background: #fff; padding: 2rem; border-radius: 16px; display: grid; gap: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
    label { display: grid; gap: .4rem; font-size: .9rem; color: #334155; }
    input { border: 1px solid #cbd5e1; border-radius: 10px; padding: .7rem .8rem; font-size: .95rem; }
    button { border: none; border-radius: 10px; padding: .75rem 1rem; font-weight: 600; background: #2563eb; color: #fff; cursor: pointer; }
    .error { color: #b91c1c; font-size: .85rem; margin: 0; }
  `]
})
export class LoginPage {
  username = '';
  password = '';
  errorMessage = signal('');

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  submit(): void {
    const isValid = this.authService.login(this.username, this.password);

    if (!isValid) {
      this.errorMessage.set('Invalid credentials.');
      return;
    }

    this.errorMessage.set('');
    void this.router.navigate(['/orders']);
  }
}
