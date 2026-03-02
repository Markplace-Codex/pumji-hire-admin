import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from '../api/api/customer.service';
import { AuthenticateResponse } from '../api/model/authenticateResponse';
import { LoginCustomerRequest } from '../api/model/loginCustomerRequest';

@Component({
  selector: 'app-super-admin-login',
  imports: [ReactiveFormsModule],
  templateUrl: './super-admin-login.component.html',
  styleUrl: './super-admin-login.component.scss'
})
export class SuperAdminLoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    const payload: LoginCustomerRequest = {
      email: this.loginForm.controls.email.value,
      password: this.loginForm.controls.password.value
    };

    this.customerService
      .apiCustomerLoginPost(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response?.isSuccess || !response.authenticateResponse) {
            this.errorMessage.set(response?.message ?? 'Login failed.');
            return;
          }

          if (!this.isSuperAdmin(response.authenticateResponse)) {
            this.errorMessage.set('Only Super Admin users are allowed to login here.');
            return;
          }

          this.successMessage.set('Super Admin login successful.');
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Unable to login with provided credentials.');
        }
      });
  }

  private isSuperAdmin(authResponse: AuthenticateResponse): boolean {
    const tokenRole = this.getRoleFromToken(authResponse.token);

    return (
      tokenRole === 'super admin' ||
      tokenRole === 'superadmin' ||
      tokenRole === 'super_admin' ||
      tokenRole === 'super-admin' ||
      (authResponse.isAdmin === true && authResponse.customerRole === 1)
    );
  }

  private getRoleFromToken(token?: string | null): string {
    if (!token) {
      return '';
    }

    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return '';
      }

      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      const roleValue = decodedPayload.role ?? decodedPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      if (Array.isArray(roleValue)) {
        return String(roleValue[0] ?? '').toLowerCase();
      }

      return String(roleValue ?? '').toLowerCase();
    } catch {
      return '';
    }
  }
}
