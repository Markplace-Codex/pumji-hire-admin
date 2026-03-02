import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'super-admin-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isLoggedIn = signal<boolean>(this.readToken());

  login(username: string, password: string): boolean {
    const valid = username.trim().toLowerCase() === 'superadmin' && password === 'admin@123';

    if (!valid) {
      return false;
    }

    localStorage.setItem(TOKEN_KEY, 'active-session');
    this.isLoggedIn.set(true);
    return true;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
  }

  private readToken(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return Boolean(localStorage.getItem(TOKEN_KEY));
  }
}
