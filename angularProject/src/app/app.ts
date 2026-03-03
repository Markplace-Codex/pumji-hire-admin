import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from './api/api/customer.service';
import { getApiBasePathStorageKey, resolveApiBasePath } from './api-base-path';

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
  protected readonly apiBasePathStorageKey = getApiBasePathStorageKey();

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

    const loginPayload = {
      email: trimmedIdentifier.includes('@') ? trimmedIdentifier : null,
      phoneNumber: trimmedIdentifier.includes('@') ? null : trimmedIdentifier,
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
            this.errorMessage.set(
              'Login API endpoint was not found. Configure API base path and point it to your backend service.'
            );
            return;
          }

          const message =
            typeof error.error === 'object' && error.error !== null && 'message' in error.error
              ? String((error.error as { message?: string }).message ?? '')
              : '';

          this.errorMessage.set(message || 'Unable to sign in right now. Please try again.');
        }
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected hasError(controlName: 'identifier' | 'password'): boolean {
    const control = this.signInForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
