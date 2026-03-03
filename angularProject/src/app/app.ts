import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from './api/api/customer.service';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

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
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to sign in right now. Please try again.');
        }
      });
  }

  protected hasError(controlName: 'identifier' | 'password'): boolean {
    const control = this.signInForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
