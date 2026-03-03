import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from './api/api/customer.service';
import { resolveApiBasePath } from './api-base-path';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);

  protected readonly apiBasePath = resolveApiBasePath();

  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly submitButtonText = computed(() => (this.isSubmitting() ? 'Signing in...' : 'Sign in'));

  protected readonly signInForm = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected onSubmit(): void {
    if (this.signInForm.invalid || this.isSubmitting()) {
      this.signInForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { identifier, password } = this.signInForm.getRawValue();
    const trimmedIdentifier = identifier.trim();

    const isEmailLogin = trimmedIdentifier.includes('@');
    const loginPayload = {
      // API accepts either email or phone, but sending null caused 400 on this backend.
      email: isEmailLogin ? trimmedIdentifier : '',
      phoneNumber: isEmailLogin ? '' : trimmedIdentifier,
      password
    };

    this.customerService
      .apiCustomerLoginPost(loginPayload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess || !response.authenticateResponse) {
            this.errorMessage.set(response.message ?? 'Sign in failed. Please check your credentials.');
            return;
          }

          const authData = response.authenticateResponse;
          if (authData.token) {
            localStorage.setItem('authToken', authData.token);
          }

          const displayName = authData.customerName || authData.userName || authData.email || authData.phoneNumber;
          this.successMessage.set(
            response.message ?? `Signed in successfully${displayName ? ` as ${displayName}` : ''}.`
          );
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.errorMessage.set('Login API endpoint was not found on the configured server. Please contact support.');
            return;
          }

          const message = this.resolveErrorMessage(error);
          this.errorMessage.set(message || 'Unable to sign in right now. Please try again.');
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null) {
      const payload = error.error as { message?: unknown; errors?: Record<string, unknown> };

      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        return payload.message;
      }

      if (payload.errors && typeof payload.errors === 'object') {
        const validationMessages = Object.values(payload.errors)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

        if (validationMessages.length > 0) {
          return validationMessages.join(' ');
        }
      }
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    if (error.status === 400) {
      return 'Invalid login request or credentials. Please verify phone/email and password.';
    }

    return '';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected hasError(controlName: 'identifier' | 'password'): boolean {
    const control = this.signInForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
