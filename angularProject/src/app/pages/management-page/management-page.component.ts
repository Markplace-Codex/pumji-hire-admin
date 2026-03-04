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
    pagination?: {
      totalCount?: number;
      pageSize?: number;
      currentPage?: number;
      totalPages?: number;
    };
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
  private readonly customerPageSize = 3;
  private readonly contactPageSize = 10;
  private readonly route = inject(ActivatedRoute);
  private readonly httpClient = inject(HttpClient);
  private readonly contactService = inject(ContactService);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);
  protected readonly customerList = signal<CustomerListItem[]>([]);
  protected readonly customerCurrentPage = signal(1);
  protected readonly customerTotalPages = signal(1);
  protected readonly isLoadingCustomers = signal(false);
  protected readonly customersErrorMessage = signal<string | null>(null);

  protected readonly contactRequestList = signal<ContactFromDto[]>([]);
  protected readonly contactCurrentPage = signal(1);
  protected readonly isLoadingContactRequests = signal(false);
  protected readonly contactRequestsErrorMessage = signal<string | null>(null);
  protected readonly paginatedContactRequests = computed(() => {
    const startIndex = (this.contactCurrentPage() - 1) * this.contactPageSize;
    return this.contactRequestList().slice(startIndex, startIndex + this.contactPageSize);
  });
  protected readonly contactTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.contactRequestList().length / this.contactPageSize))
  );

  protected readonly isCustomersPage = computed(() => this.route.snapshot.routeConfig?.path === 'customers');
  protected readonly isContactUsPage = computed(() => this.route.snapshot.routeConfig?.path === 'contact-us-requests');

  constructor() {
    if (this.isCustomersPage()) {
      this.loadCustomers(0);
      return;
    }

    if (this.isContactUsPage()) {
      this.loadContactRequests();
    }
  }

  private loadCustomers(pageIndex: number): void {
    this.isLoadingCustomers.set(true);
    this.customersErrorMessage.set(null);

    this.httpClient
      .get<CustomersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers`, {
        params: {
          pageIndex,
          pageSize: this.customerPageSize
        }
      })
      .subscribe({
        next: (response) => {
          const customersResponse = response.customereListResponses;
          this.customerList.set(customersResponse?.customerList ?? []);

          const currentPage = customersResponse?.pagination?.currentPage ?? pageIndex;
          const totalPages = customersResponse?.pagination?.totalPages ?? 1;
          this.customerCurrentPage.set(currentPage + 1);
          this.customerTotalPages.set(Math.max(1, totalPages));
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
      this.loadCustomers(this.customerCurrentPage() - 2);
    }
  }

  protected nextCustomerPage(): void {
    if (this.customerCurrentPage() < this.customerTotalPages()) {
      this.loadCustomers(this.customerCurrentPage());
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
