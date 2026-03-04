import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactService } from '../../api/api/contact.service';
import { ContactFromDto } from '../../api/model/contactFromDto';

import { resolveApiBasePath } from '../../api-base-path';

type CustomerListItem = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  active: boolean;
};

type CustomersApiResponse = {
  customereListResponses?: {
    customerList?: CustomerListItem[];
  };
};

@Component({
  selector: 'app-management-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './management-page.component.html',
  styleUrl: './management-page.component.scss'
})
export class ManagementPageComponent {
  private readonly pageSize = 10;
  private readonly route = inject(ActivatedRoute);
  private readonly httpClient = inject(HttpClient);
  private readonly contactService = inject(ContactService);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);
  protected readonly customerList = signal<CustomerListItem[]>([]);
  protected readonly customerCurrentPage = signal(1);
  protected readonly isLoadingCustomers = signal(false);
  protected readonly customersErrorMessage = signal<string | null>(null);
  protected readonly paginatedCustomers = computed(() => {
    const startIndex = (this.customerCurrentPage() - 1) * this.pageSize;
    return this.customerList().slice(startIndex, startIndex + this.pageSize);
  });
  protected readonly customerTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.customerList().length / this.pageSize))
  );

  protected readonly contactRequestList = signal<ContactFromDto[]>([]);
  protected readonly contactCurrentPage = signal(1);
  protected readonly isLoadingContactRequests = signal(false);
  protected readonly contactRequestsErrorMessage = signal<string | null>(null);
  protected readonly paginatedContactRequests = computed(() => {
    const startIndex = (this.contactCurrentPage() - 1) * this.pageSize;
    return this.contactRequestList().slice(startIndex, startIndex + this.pageSize);
  });
  protected readonly contactTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.contactRequestList().length / this.pageSize))
  );

  protected readonly isCustomersPage = computed(() => this.route.snapshot.routeConfig?.path === 'customers');
  protected readonly isContactUsPage = computed(() => this.route.snapshot.routeConfig?.path === 'contact-us-requests');

  constructor() {
    if (this.isCustomersPage()) {
      this.loadCustomers();
      return;
    }

    if (this.isContactUsPage()) {
      this.loadContactRequests();
    }
  }

  private loadCustomers(): void {
    this.isLoadingCustomers.set(true);
    this.customersErrorMessage.set(null);

    this.httpClient
      .get<CustomersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers`)
      .subscribe({
        next: (response) => {
          this.customerList.set(response.customereListResponses?.customerList ?? []);
          this.customerCurrentPage.set(1);
          this.isLoadingCustomers.set(false);
        },
        error: () => {
          this.customersErrorMessage.set('Unable to load customers right now. Please try again.');
          this.isLoadingCustomers.set(false);
        }
      });
  }

  protected previousCustomerPage(): void {
    if (this.customerCurrentPage() > 1) {
      this.customerCurrentPage.update((currentPage) => currentPage - 1);
    }
  }

  protected nextCustomerPage(): void {
    if (this.customerCurrentPage() < this.customerTotalPages()) {
      this.customerCurrentPage.update((currentPage) => currentPage + 1);
    }
  }

  private loadContactRequests(): void {
    this.isLoadingContactRequests.set(true);
    this.contactRequestsErrorMessage.set(null);

    this.contactService.apiContactGetAllGet(0, 2147483647).subscribe({
      next: (response) => {
        this.contactRequestList.set(response.paginationContactFrom?.contactFromDtos ?? []);
        this.contactCurrentPage.set(1);
        this.isLoadingContactRequests.set(false);
      },
      error: () => {
        this.contactRequestsErrorMessage.set('Unable to load contact requests right now. Please try again.');
        this.isLoadingContactRequests.set(false);
      }
    });
  }

  protected previousContactPage(): void {
    if (this.contactCurrentPage() > 1) {
      this.contactCurrentPage.update((currentPage) => currentPage - 1);
    }
  }

  protected nextContactPage(): void {
    if (this.contactCurrentPage() < this.contactTotalPages()) {
      this.contactCurrentPage.update((currentPage) => currentPage + 1);
    }
  }
}
