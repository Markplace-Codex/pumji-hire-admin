import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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

type AssignRoleApiResponse = {
  isSuccess?: boolean;
  message?: string | null;
};

type RoleOption = {
  id: number;
  label: string;
};

type CustomerUpdateEmailRequest = {
  customerId: number;
  active?: boolean;
  role?: string;
  creditsCount?: number;
};

@Component({
  selector: 'app-assigning-roles-page',
  imports: [RouterLink],
  templateUrl: './assigning-roles-page.component.html',
  styleUrl: './assigning-roles-page.component.scss'
})
export class AssigningRolesPageComponent {
  private readonly httpClient = inject(HttpClient);

  protected readonly searchFieldOptions: Array<{ value: CustomerSearchField; label: string }> = [
    { value: 'username', label: 'Username' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' }
  ];

  protected readonly roleOptions: RoleOption[] = [
    { id: 1, label: 'Registered' },
    { id: 2, label: 'Guests' },
    { id: 3, label: 'Employee' },
    { id: 4, label: 'Recruiter' },
    { id: 5, label: 'Administrators' },
    { id: 6, label: 'CorporateAdmin' },
    { id: 7, label: 'HR' },
    { id: 8, label: 'SupportAdmin' },
    { id: 9, label: 'SuperAdmin' }
  ];

  protected readonly selectedSearchField = signal<CustomerSearchField>('username');
  protected readonly searchValue = signal('');
  protected readonly isSearching = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly customers = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomerId = signal<number | null>(null);
  protected readonly selectedRoleId = signal<number | null>(null);

  protected readonly canAssignRole = computed(
    () => this.selectedCustomerId() != null && this.selectedRoleId() != null && !this.isSubmitting() && !this.isSearching()
  );

  protected updateSelectedSearchField(rawValue: string): void {
    const selectedOption = this.searchFieldOptions.find((option) => option.value === rawValue);
    this.selectedSearchField.set(selectedOption?.value ?? 'username');
  }

  protected updateSearchValue(rawValue: string): void {
    this.searchValue.set(rawValue);
  }

  protected updateSelectedRole(rawValue: string): void {
    if (!rawValue.trim()) {
      this.selectedRoleId.set(null);
      return;
    }

    const parsedRole = Number(rawValue);
    this.selectedRoleId.set(Number.isFinite(parsedRole) ? parsedRole : null);
  }

  protected searchCustomers(): void {
    const trimmedValue = this.searchValue().trim();
    if (!trimmedValue) {
      this.errorMessage.set('Please enter a search value.');
      this.customers.set([]);
      this.selectedCustomerId.set(null);
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
          this.selectedCustomerId.set(null);
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
    this.selectedCustomerId.set(null);
    this.selectedRoleId.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected toggleCustomerSelection(customerId: number | undefined, checked: boolean): void {
    if (customerId == null) {
      return;
    }

    this.selectedCustomerId.set(checked ? customerId : null);
  }

  protected isCustomerSelected(customerId: number | undefined): boolean {
    if (customerId == null) {
      return false;
    }

    return this.selectedCustomerId() === customerId;
  }

  protected assignRole(): void {
    const selectedCustomerId = this.selectedCustomerId();
    const selectedRoleId = this.selectedRoleId();

    if (selectedCustomerId == null) {
      this.errorMessage.set('Please select one customer.');
      return;
    }

    if (selectedRoleId == null) {
      this.errorMessage.set('Please select a customer role.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const params = new HttpParams()
      .set('customerId', String(selectedCustomerId))
      .set('customerRoles', String(selectedRoleId));

    this.httpClient
      .post<AssignRoleApiResponse>(`${resolveApiBasePath()}/api/Customer/SelectEmployeeType`, null, { params })
      .subscribe({
        next: (response) => {
          if (response?.isSuccess === false) {
            this.errorMessage.set(response.message?.trim() || 'Unable to assign customer role.');
          } else {
            const selectedRoleLabel = this.roleOptions.find((role) => role.id === selectedRoleId)?.label ?? '';
            this.sendCustomerUpdateEmail({
              customerId: selectedCustomerId,
              role: selectedRoleLabel
            });
            this.successMessage.set(response?.message?.trim() || 'Customer role assigned successfully.');
          }
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error, 'customer role assignment'));
          this.isSubmitting.set(false);
        }
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
