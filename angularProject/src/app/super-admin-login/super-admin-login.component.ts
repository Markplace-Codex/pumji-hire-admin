import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from '../api/api/customer.service';
import { AuthenticateResponse } from '../api/model/authenticateResponse';
import { CustomerRoles } from '../api/model/customerRoles';
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

          if (!this.isAllowedAdminRole(response.authenticateResponse)) {
            this.errorMessage.set('Only Administrator users are allowed to login here.');
            return;
          }

          this.successMessage.set('Administrator login successful.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getLoginErrorMessage(error));
        }
      });
  }

  private isAllowedAdminRole(authResponse: AuthenticateResponse): boolean {
    return authResponse.customerRole === CustomerRoles.NUMBER_5;
  }

  private getLoginErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.status === 0) {
      return 'Login API is unreachable. Set window.__API_BASE_PATH__ to your backend URL (for example: https://api.your-domain.com).';
    }

    return `Login request failed (${error.status}).`;
  }
}
