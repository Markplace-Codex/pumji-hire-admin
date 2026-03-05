import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContactService } from '../../api/api/contact.service';
import { ContactFromDto } from '../../api/model/contactFromDto';

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
  private readonly customerApiUrl = 'https://dev.pumji.com/api/SuperAdmin/Customers';
  private readonly customerRequestPageSize = 500;
  private readonly customerPageSize = 10;
  private readonly contactPageSize = 10;
  private readonly route = inject(ActivatedRoute);
  private readonly httpClient = inject(HttpClient);
  private readonly contactService = inject(ContactService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);
  protected readonly customerList = signal<CustomerListItem[]>([]);
  protected readonly customerTotalCount = signal(0);
  protected readonly customerCurrentPage = signal(1);
  protected readonly customerTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.customerList().length / this.customerPageSize))
  );
  protected readonly paginatedCustomers = computed(() => {
    const startIndex = (this.customerCurrentPage() - 1) * this.customerPageSize;
    return this.customerList().slice(startIndex, startIndex + this.customerPageSize);
  });
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
      if (this.isBrowser) {
        this.debugCustomerApi('Customer page opened in browser. Starting customer API fetch.');
      }
      void this.loadCustomers();
      return;
    }

    if (this.isContactUsPage()) {
      this.loadContactRequests();
    }
  }

  protected retryCustomers(): void {
    void this.loadCustomers();
  }

  private debugCustomerApi(message: string, data?: unknown): void {
    if (!this.isBrowser) {
      return;
    }

    if (data !== undefined) {
      console.info(`[Customers Page] ${message}`, data);
      return;
    }

    console.info(`[Customers Page] ${message}`);
  }

  private async loadCustomers(): Promise<void> {
    this.isLoadingCustomers.set(true);
    this.customersErrorMessage.set(null);

    try {
      const allCustomers: CustomerListItem[] = [];
      let totalCount = 0;
      let totalPages = 1;
      let currentPage = 1;
      let pageIndex = 0;

      do {
        const requestUrl = `${this.customerApiUrl}?pageIndex=${pageIndex}&pageSize=${this.customerRequestPageSize}`;
        this.debugCustomerApi('Calling API URL:', requestUrl);

        const response = await firstValueFrom(this.httpClient.get<CustomersApiResponse>(requestUrl));
        this.debugCustomerApi('API response data:', response);

        const customersResponse = response.customereListResponses;
        const pagination = customersResponse?.pagination;

        allCustomers.push(...(customersResponse?.customerList ?? []));
        totalCount = pagination?.totalCount ?? allCustomers.length;
        totalPages = Math.max(1, pagination?.totalPages ?? 1);
        currentPage = Math.max(1, (pagination?.currentPage ?? 0) + 1);
        pageIndex += 1;
      } while (pageIndex < totalPages && allCustomers.length < totalCount);

      this.debugCustomerApi('Completed API fetch.', {
        totalCustomersFetched: allCustomers.length,
        totalCount,
        totalPages,
        currentPage
      });

      const uniqueCustomers = Array.from(new Map(allCustomers.map((customer) => [customer.id, customer])).values());

      this.customerList.set(uniqueCustomers);
      this.customerTotalCount.set(totalCount || uniqueCustomers.length);
      this.customerCurrentPage.set(1);
    } catch (error) {
      this.debugCustomerApi('API request failed:', error);
      this.customersErrorMessage.set('Unable to load customers right now. Please try again.');
    } finally {
      this.isLoadingCustomers.set(false);
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
