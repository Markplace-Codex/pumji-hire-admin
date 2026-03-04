import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  templateUrl: './management-page.component.html',
  styleUrl: './management-page.component.scss'
})
export class ManagementPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly httpClient = inject(HttpClient);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);
  protected readonly customerList = signal<CustomerListItem[]>([]);
  protected readonly isLoadingCustomers = signal(false);
  protected readonly customersErrorMessage = signal<string | null>(null);
  protected readonly isCustomersPage = computed(() => this.route.snapshot.routeConfig?.path === 'customers');

  constructor() {
    if (this.isCustomersPage()) {
      this.loadCustomers();
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
          this.isLoadingCustomers.set(false);
        },
        error: () => {
          this.customersErrorMessage.set('Unable to load customers right now. Please try again.');
          this.isLoadingCustomers.set(false);
        }
      });
  }
}
