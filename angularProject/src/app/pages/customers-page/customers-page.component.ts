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

type CustomerSearchApiResponse = {
  customerList?: CustomerListItem[];
  isSuccess?: boolean;
  message?: string | null;
};

type CustomerSearchField = 'username' | 'name' | 'email' | 'phone' | 'active' | 'createdOn';

type CustomerSearchRequest = {
  searchBy: string;
  searchValue: string;
  customerRole: string;
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
  protected readonly selectedSearchField = signal<CustomerSearchField>('username');
  protected readonly searchValue = signal('');
  protected readonly selectedCustomerRole = signal('');
  protected readonly editingCustomerId = signal<number | null>(null);
  protected readonly editingActiveValue = signal<boolean | null>(null);
  protected readonly savingCustomerId = signal<number | null>(null);
  protected readonly selectedCustomerIds = signal<Set<number>>(new Set());

  protected readonly searchFieldOptions: Array<{ value: CustomerSearchField; label: string }> = [
    { value: 'username', label: 'Username' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'active', label: 'Active' },
    { value: 'createdOn', label: 'Created On' }
  ];

  protected readonly customerRoleOptions: string[] = [
    'Registered',
    'Guests',
    'Employee',
    'Recruiter',
    'Administrators',
    'CorporateAdmin',
    'HR',
    'SupportAdmin',
    'SuperAdmin'
  ];

  protected readonly isActiveSearch = computed(() => this.selectedSearchField() === 'active');
  protected readonly isCreatedOnSearch = computed(() => this.selectedSearchField() === 'createdOn');
  protected readonly hasActiveFilter = computed(
    () => this.selectedSearchField() === 'active' && this.searchValue().trim().length > 0
  );
  protected readonly hasTextFilter = computed(
    () => this.selectedSearchField() !== 'active' && this.searchValue().trim().length > 0
  );
  protected readonly hasRoleFilter = computed(() => this.selectedCustomerRole().trim().length > 0);
  protected readonly hasSearchFilter = computed(() => this.hasTextFilter() || this.hasActiveFilter() || this.hasRoleFilter());

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly selectedCustomersCount = computed(() => this.selectedCustomerIds().size);
  protected readonly allVisibleCustomersSelected = computed(() => {
    const selectableIds = this.customers()
      .map((customer) => customer.id)
      .filter((id): id is number => id != null);

    if (selectableIds.length === 0) {
      return false;
    }

    const selectedIds = this.selectedCustomerIds();
    return selectableIds.every((id) => selectedIds.has(id));
  });
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

  protected updateSelectedSearchField(rawValue: string): void {
    const selectedOption = this.searchFieldOptions.find((option) => option.value === rawValue);
    this.selectedSearchField.set(selectedOption?.value ?? 'username');
    this.searchValue.set('');
  }

  protected updateSearchValue(rawValue: string): void {
    this.searchValue.set(rawValue);
  }

  protected updateSelectedCustomerRole(rawValue: string): void {
    this.selectedCustomerRole.set(rawValue);
  }

  protected applySearchFilter(): void {
    this.loadCustomers(0);
  }

  protected clearSearchFilter(): void {
    this.searchValue.set('');
    this.selectedCustomerRole.set('');
    this.loadCustomers(0);
  }

  protected toggleCustomerSelection(customerId: number | undefined, isChecked: boolean): void {
    if (customerId == null) {
      return;
    }

    this.selectedCustomerIds.update((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      if (isChecked) {
        nextSelection.add(customerId);
      } else {
        nextSelection.delete(customerId);
      }

      return nextSelection;
    });
  }

  protected isCustomerSelected(customerId: number | undefined): boolean {
    if (customerId == null) {
      return false;
    }

    return this.selectedCustomerIds().has(customerId);
  }

  protected toggleSelectAllVisible(isChecked: boolean): void {
    const visibleCustomerIds = this.customers()
      .map((customer) => customer.id)
      .filter((id): id is number => id != null);

    this.selectedCustomerIds.update((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (isChecked) {
        visibleCustomerIds.forEach((id) => nextSelection.add(id));
      } else {
        visibleCustomerIds.forEach((id) => nextSelection.delete(id));
      }

      return nextSelection;
    });
  }

  protected downloadSelectedCustomersCsv(): void {
    const selectedCustomers = this.customers().filter((customer) =>
      customer.id != null ? this.selectedCustomerIds().has(customer.id) : false
    );

    if (selectedCustomers.length === 0) {
      this.errorMessage.set('Please select at least one customer to download CSV.');
      return;
    }

    this.errorMessage.set(null);

    const headers = ['id', 'username', 'name', 'email', 'phone', 'gender', 'active', 'createdOn', 'modifiedOn'];
    const rows = selectedCustomers.map((customer) => [
      this.csvValue(customer.id),
      this.csvValue(customer.username),
      this.csvValue(this.getCustomerDisplayName(customer)),
      this.csvValue(customer.email),
      this.csvValue(customer.phone),
      this.csvValue(customer.gender),
      this.csvValue(customer.active == null ? '' : customer.active ? 'true' : 'false'),
      this.csvValue(customer.createdOn),
      this.csvValue(customer.modifiedOn)
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `customers-${new Date().toISOString().slice(0, 10)}.csv`;

    const url = URL.createObjectURL(blob);
    const anchorElement = document.createElement('a');
    anchorElement.href = url;
    anchorElement.download = fileName;
    anchorElement.click();
    URL.revokeObjectURL(url);
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

    if (this.hasSearchFilter()) {
      this.searchCustomers();
      return;
    }

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
          this.selectedCustomerIds.set(new Set());
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private searchCustomers(): void {
    const payload: CustomerSearchRequest = {
      searchBy: this.selectedSearchField(),
      searchValue: this.searchValue().trim(),
      customerRole: this.selectedCustomerRole().trim()
    };

    this.httpClient
      .post<CustomerSearchApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers/Search`, payload)
      .subscribe({
        next: (response) => {
          const customerList = response.customerList ?? [];

          this.customers.set(customerList);
          this.totalCount.set(customerList.length);
          this.pageSize.set(this.defaultPageSize);
          this.currentPage.set(0);
          this.totalPages.set(customerList.length > 0 ? 1 : 0);
          this.selectedCustomerIds.set(new Set());
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private applyCustomersResponse(response: CustomersApiResponse, fallbackPageIndex: number): void {
    const pageData = response.customerListResponses?.pagination;

    this.customers.set(response.customerListResponses?.customerList ?? []);
    this.totalCount.set(pageData?.totalCount ?? response.customerListResponses?.customerList?.length ?? 0);
    this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
    this.currentPage.set(pageData?.currentPage ?? fallbackPageIndex);
    this.totalPages.set(pageData?.totalPages ?? 0);
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

  private getCustomerDisplayName(customer: CustomerListItem): string {
    return `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
  }

  private csvValue(value: string | number | boolean | undefined): string {
    const normalizedValue = `${value ?? ''}`;
    const escapedValue = normalizedValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
}
