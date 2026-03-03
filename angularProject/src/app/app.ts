import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CustomerService } from './api/api/customer.service';
import { AuthenticateResponseSchema } from './api/model/authenticateResponseSchema';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly authResponse = signal<AuthenticateResponseSchema | null>(null);

  protected readonly signInForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
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
    this.authResponse.set(null);

    const { email, password } = this.signInForm.getRawValue();

    this.customerService
      .apiCustomerLoginPost({ email, password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.authResponse.set(response);

          if (response.isSuccess) {
            this.successMessage.set(response.message ?? 'Signed in successfully.');
            return;
          }

          this.errorMessage.set(response.message ?? 'Sign in failed. Please check your credentials.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to sign in right now. Please try again.');
        }
      });
  }

  protected hasError(controlName: 'email' | 'password'): boolean {
    const control = this.signInForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
