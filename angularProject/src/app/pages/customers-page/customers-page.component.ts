import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type CustomerListItem = {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  phone?: string;
  active?: boolean;
  createdOn?: string;
  modifiedOn?: string;
};

type PaginationDetails = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type CustomersApiResponse = {
  customerListResponses?: {
    pagination?: PaginationDetails;
    customerList?: CustomerListItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-customers-page',
  imports: [RouterLink],
  templateUrl: './customers-page.component.html',
  styleUrl: './customers-page.component.scss'
})
export class CustomersPageComponent {
  private readonly httpClient = inject(HttpClient);

  private readonly defaultPageSize = 10;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly customers = signal<CustomerListItem[]>([]);

  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly editingCustomerId = signal<number | null>(null);
  protected readonly editingActiveValue = signal<boolean | null>(null);
  protected readonly savingCustomerId = signal<number | null>(null);

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.currentPage() + 1} of ${this.totalPages()}`;
  });

  constructor() {
    this.loadCustomers(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadCustomers(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadCustomers(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadCustomers(this.currentPage());
  }

  protected editCustomer(customer: CustomerListItem): void {
    if (customer.id == null) {
      this.errorMessage.set('Unable to edit active status because customer id is missing.');
      return;
    }

    this.errorMessage.set(null);
    this.editingCustomerId.set(customer.id);
    this.editingActiveValue.set(!!customer.active);
  }

  protected isEditingCustomer(customerId: number | undefined): boolean {
    if (customerId == null) {
      return false;
    }

    return this.editingCustomerId() === customerId;
  }

  protected updateEditingActiveValue(rawValue: string): void {
    this.editingActiveValue.set(rawValue === 'true');
  }

  protected cancelEdit(): void {
    this.editingCustomerId.set(null);
    this.editingActiveValue.set(null);
    this.savingCustomerId.set(null);
  }

  protected saveActiveStatus(customer: CustomerListItem): void {
    if (customer.id == null || this.editingActiveValue() == null) {
      this.errorMessage.set('Unable to save active status because required data is missing.');
      return;
    }

    this.errorMessage.set(null);
    this.savingCustomerId.set(customer.id);

    this.httpClient
      .put<void>(`${resolveApiBasePath()}/api/SuperAdmin/CustomerActiveStatus`, null, {
        params: {
          CustomerId: customer.id,
          Active: this.editingActiveValue()!
        }
      })
      .subscribe({
        next: () => {
          this.customers.update((customers) =>
            customers.map((item) => {
              if (item.id !== customer.id) {
                return item;
              }

              return {
                ...item,
                active: this.editingActiveValue()!
              };
            })
          );

          this.cancelEdit();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.savingCustomerId.set(null);
        }
      });
  }

  private loadCustomers(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<CustomersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers`, {
        params: {
          pageIndex,
          pageSize: this.pageSize()
        }
      })
      .subscribe({
        next: (response) => {
          const pageData = response.customerListResponses?.pagination;

          this.customers.set(response.customerListResponses?.customerList ?? []);
          this.totalCount.set(pageData?.totalCount ?? 0);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'You are not authorized to view customers. Please sign in again.';
    }

    if (error.status === 404) {
      return 'Customers API endpoint was not found. Please check API configuration.';
    }

    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Unable to load customers right now. Please try again.';
  }
}
