import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { resolveApiBasePath } from '../../api-base-path';

type CustomerListItem = {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type CustomerSearchField = 'username' | 'name' | 'email' | 'phone';

type CustomerSearchRequest = {
  searchBy: string;
  searchValue: string;
};

type CustomerSearchApiResponse = {
  customerList?: CustomerListItem[];
  isSuccess?: boolean;
  message?: string | null;
};

type ManualCreditResponse = {
  isSuccess?: boolean;
  message?: string | null;
};

type CustomerUpdateEmailRequest = {
  customerId: number;
  active?: boolean;
  role?: string;
  creditsCount?: number;
};

@Component({
  selector: 'app-manual-credits-page',
  imports: [RouterLink],
  templateUrl: './manual-credits-page.component.html',
  styleUrl: './manual-credits-page.component.scss'
})
export class ManualCreditsPageComponent {
  private readonly httpClient = inject(HttpClient);

  protected readonly searchFieldOptions: Array<{ value: CustomerSearchField; label: string }> = [
    { value: 'username', label: 'Username' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' }
  ];

  protected readonly selectedSearchField = signal<CustomerSearchField>('username');
  protected readonly searchValue = signal('');
  protected readonly isSearching = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly customers = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomerIds = signal<number[]>([]);
  protected readonly creditCount = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly selectedFile = signal<File | null>(null);

  protected readonly hasSelection = computed(() => this.selectedCustomerIds().length > 0);

  protected updateSelectedSearchField(rawValue: string): void {
    const selectedOption = this.searchFieldOptions.find((option) => option.value === rawValue);
    this.selectedSearchField.set(selectedOption?.value ?? 'username');
  }

  protected updateSearchValue(rawValue: string): void {
    this.searchValue.set(rawValue);
  }

  protected searchCustomers(): void {
    const trimmedValue = this.searchValue().trim();
    if (!trimmedValue) {
      this.errorMessage.set('Please enter a search value.');
      this.customers.set([]);
      this.selectedCustomerIds.set([]);
      return;
    }

    this.isSearching.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: CustomerSearchRequest = {
      searchBy: this.selectedSearchField(),
      searchValue: trimmedValue
    };

    this.httpClient
      .post<CustomerSearchApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers/Search`, payload)
      .subscribe({
        next: (response) => {
          this.customers.set(response.customerList ?? []);
          this.selectedCustomerIds.set([]);
          this.isSearching.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error, 'customers'));
          this.isSearching.set(false);
        }
      });
  }

  protected clearSearch(): void {
    this.searchValue.set('');
    this.customers.set([]);
    this.selectedCustomerIds.set([]);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected toggleCustomerSelection(customerId: number | undefined, checked: boolean): void {
    if (customerId == null) {
      return;
    }

    if (checked) {
      this.selectedCustomerIds.update((ids) => (ids.includes(customerId) ? ids : [...ids, customerId]));
      return;
    }

    this.selectedCustomerIds.update((ids) => ids.filter((id) => id !== customerId));
  }

  protected toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedCustomerIds.set([]);
      return;
    }

    this.selectedCustomerIds.set(this.customers().map((customer) => customer.id).filter((id): id is number => id != null));
  }

  protected isCustomerSelected(customerId: number | undefined): boolean {
    if (customerId == null) {
      return false;
    }

    return this.selectedCustomerIds().includes(customerId);
  }

  protected areAllCustomersSelected(): boolean {
    const validIds = this.customers().map((customer) => customer.id).filter((id): id is number => id != null);
    return validIds.length > 0 && validIds.every((id) => this.selectedCustomerIds().includes(id));
  }

  protected updateCreditCount(rawValue: string): void {
    if (!rawValue.trim()) {
      this.creditCount.set(null);
      return;
    }

    const parsedValue = Number(rawValue);
    this.creditCount.set(Number.isFinite(parsedValue) ? parsedValue : null);
  }

  protected updateReason(rawValue: string): void {
    this.reason.set(rawValue);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  protected submitManualCredits(): void {
    if (!this.hasSelection()) {
      this.errorMessage.set('Please select at least one customer.');
      return;
    }

    const creditCount = this.creditCount();
    if (creditCount == null || creditCount <= 0) {
      this.errorMessage.set('Please enter a valid credit count greater than 0.');
      return;
    }

    const reason = this.reason().trim();
    if (!reason) {
      this.errorMessage.set('Please enter a reason.');
      return;
    }

    if (!this.selectedFile()) {
      this.errorMessage.set('Please upload an image file.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const requests = this.selectedCustomerIds().map((customerId) => {
      const formData = new FormData();
      formData.append('file', this.selectedFile()!);

      return this.httpClient
        .post<ManualCreditResponse>(`${resolveApiBasePath()}/api/Payment/AddManualCredits`, formData, {
          params: {
            input: customerId,
            creditCount,
            reason
          }
        })
        .pipe(
          catchError((error: HttpErrorResponse) =>
            of({
              isSuccess: false,
              message: this.resolveErrorMessage(error, `manual credits for customer ${customerId}`),
              customerId
            })
          )
        );
    });

    forkJoin(requests).subscribe((results) => {
      const failures = results.filter((result) => !result.isSuccess);

      if (failures.length === 0) {
        this.selectedCustomerIds().forEach((customerId) => {
          this.sendCustomerUpdateEmail({
            customerId,
            creditsCount: creditCount,
            role: ''
          });
        });

        this.successMessage.set(`Credits added successfully for ${results.length} customer(s).`);
        this.selectedCustomerIds.set([]);
        this.creditCount.set(null);
        this.reason.set('');
        this.selectedFile.set(null);
      } else {
        this.errorMessage.set(failures.map((item) => item.message || 'Failed to add credits.').join(' | '));
      }

      this.isSubmitting.set(false);
    });
  }

  private sendCustomerUpdateEmail(payload: CustomerUpdateEmailRequest): void {
    this.httpClient.post<void>(`${resolveApiBasePath()}/api/SuperAdmin/SendCustomerUpdateEmail`, payload).subscribe();
  }
  private resolveErrorMessage(error: HttpErrorResponse, resourceName: string): string {
    if (error.status === 401 || error.status === 403) {
      return `You are not authorized to access ${resourceName}. Please sign in again.`;
    }

    if (error.status === 404) {
      return `${resourceName[0].toUpperCase()}${resourceName.slice(1)} API endpoint was not found. Please check API configuration.`;
    }

    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return `Unable to process ${resourceName} right now. Please try again.`;
  }
}
