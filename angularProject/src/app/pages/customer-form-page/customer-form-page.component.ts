import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CustomerService } from '../../api/api/customer.service';
import { RegisterModelDto } from '../../api/model/registerModelDto';

type CustomerFormModel = {
  email: string;
  username: string;
  password: string;
  gender: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  is18OrAbove: boolean;
  isWhatsAppNumber: boolean;
  countryId: string;
};

@Component({
  selector: 'app-customer-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './customer-form-page.component.html',
  styleUrl: './customer-form-page.component.scss'
})
export class CustomerFormPageComponent {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'customers/edit');

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: CustomerFormModel = this.createDefaultFormModel();

  constructor() {
    if (this.isEditMode()) {
      const stateCustomer = this.router.getCurrentNavigation()?.extras.state?.['customer'] as
        | Partial<CustomerFormModel>
        | undefined;

      if (!stateCustomer) {
        this.submitError.set('No customer selected. Please click Edit from Customers list.');
      } else {
        this.formModel = {
          ...this.formModel,
          ...stateCustomer,
          dateOfBirth: this.isoToLocalInput(stateCustomer.dateOfBirth)
        };
      }
    }
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload: RegisterModelDto = {
      email: this.formModel.email,
      username: this.formModel.username,
      password: this.formModel.password,
      gender: this.formModel.gender,
      firstName: this.formModel.firstName,
      lastName: this.formModel.lastName,
      dateOfBirth: this.localToIsoString(this.formModel.dateOfBirth),
      phoneNumber: this.formModel.phoneNumber,
      is18OrAbove: this.formModel.is18OrAbove,
      isWhatsAppNumber: this.formModel.isWhatsAppNumber,
      countryId: this.formModel.countryId
    };

    this.customerService.apiCustomerRegisterPost(payload).subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(response.message?.trim() || 'Unable to submit customer data right now.');
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(
          this.isEditMode()
            ? 'Customer details submitted successfully.'
            : 'Customer created successfully.'
        );

        this.isSubmitting.set(false);
        setTimeout(() => {
          this.router.navigate(['/customers']);
        }, 700);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error));
        this.isSubmitting.set(false);
      }
    });
  }

  protected applySampleData(): void {
    this.formModel = this.createDefaultFormModel();
  }

  private createDefaultFormModel(): CustomerFormModel {
    return {
      email: 'string@example.com',
      username: 'string',
      password: 'string',
      gender: 'string',
      firstName: 'string',
      lastName: 'string',
      dateOfBirth: this.isoToLocalInput('2026-03-06T07:50:25.393Z'),
      phoneNumber: 'string',
      is18OrAbove: true,
      isWhatsAppNumber: true,
      countryId: 'string'
    };
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Unable to submit customer data right now.';
  }

  private isoToLocalInput(value: unknown): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (unit: number): string => unit.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private localToIsoString(value: string): string {
    return value ? new Date(value).toISOString() : '';
  }
}
