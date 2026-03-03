import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { OrderService } from '../../api/api/order.service';
import { CustomerInfoModelDtoSchema } from '../../api/model/customerInfoModelDtoSchema';
import { OrderDto } from '../../api/model/orderDto';
import { resolveApiBasePath } from '../../api-base-path';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent {
  private readonly orderService = inject(OrderService);
  private readonly httpClient = inject(HttpClient);

  private readonly defaultPageSize = 5;
  private readonly apiBasePath = resolveApiBasePath();
  private customerInfoAccessDenied = false;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly orders = signal<OrderDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly customerNameById = signal<Record<number, string>>({});

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    const totalPages = this.totalPages();
    if (totalPages === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.currentPage() + 1} of ${totalPages}`;
  });

  constructor() {
    this.loadOrders(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadOrders(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadOrders(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadOrders(this.currentPage());
  }

  private loadOrders(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.apiOrderGetAllGet(pageIndex, this.pageSize()).subscribe({
      next: (response) => {
        const pageData = response.paginationOrder?.pagination;

        this.orders.set(response.paginationOrder?.orderDto ?? []);
        this.totalCount.set(pageData?.totalCount ?? 0);
        this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
        this.currentPage.set(pageData?.currentPage ?? pageIndex);
        this.totalPages.set(pageData?.totalPages ?? 0);
        this.loadCustomerNamesForOrders(this.orders());
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  protected getCustomerName(customerId: number | null | undefined): string {
    if (typeof customerId !== 'number') {
      return '-';
    }

    return this.customerNameById()[customerId] ?? `Customer #${customerId}`;
  }

  private loadCustomerNamesForOrders(orders: OrderDto[]): void {
    const idsToFetch = [...new Set(orders.map((order) => order.customerId).filter((id): id is number => typeof id === 'number'))]
      .filter((id) => !this.customerNameById()[id]);

    const authorizationHeader = this.getAuthorizationHeaderValue();

    if (idsToFetch.length === 0 || this.customerInfoAccessDenied || !authorizationHeader) {
      return;
    }

    const requests = idsToFetch.map((customerId) =>
      this.getCustomerInfo(customerId, authorizationHeader).pipe(
        map((response) => {
          const customerInfo = response.customerInfoModelDto;
          const fullName = [customerInfo?.firstName?.trim(), customerInfo?.lastName?.trim()]
            .filter((name): name is string => Boolean(name))
            .join(' ')
            .trim();
          const username = customerInfo?.username?.trim();
          const customerName = fullName || username;

          return {
            customerId,
            customerName: customerName && customerName.length > 0 ? customerName : `Customer #${customerId}`
          };
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.customerInfoAccessDenied = true;
          }

          return of({ customerId, customerName: `Customer #${customerId}` });
        })
      )
    );

    forkJoin(requests).subscribe((results) => {
      const existing = this.customerNameById();
      const updated: Record<number, string> = { ...existing };

      for (const result of results) {
        updated[result.customerId] = result.customerName;
      }

      this.customerNameById.set(updated);
    });
  }

  private getCustomerInfo(customerId: number, authorizationHeader: string) {
    const headers = new HttpHeaders().set('Authorization', authorizationHeader);
    const params = new HttpParams().set('customerId', customerId);

    return this.httpClient.get<CustomerInfoModelDtoSchema>(`${this.apiBasePath}/api/Customer/GetCustomerInfo`, { headers, params });
  }

  private getAuthorizationHeaderValue(): string | null {
    const storedToken = globalThis.localStorage?.getItem('authToken')?.trim();
    if (!storedToken) {
      return null;
    }

    const tokenWithoutQuotes = storedToken.replace(/^['"]|['"]$/g, '').trim();
    if (!tokenWithoutQuotes) {
      return null;
    }

    const bearerPrefixRegex = /^bearer\s+/i;
    if (bearerPrefixRegex.test(tokenWithoutQuotes)) {
      const tokenValue = tokenWithoutQuotes.replace(bearerPrefixRegex, '').trim();
      return tokenValue ? `Bearer ${tokenValue}` : null;
    }

    return `Bearer ${tokenWithoutQuotes}`;
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'You are not authorized to view orders. Please sign in again.';
    }

    if (error.status === 404) {
      return 'Orders API endpoint was not found. Please check API configuration.';
    }

    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Unable to load orders right now. Please try again.';
  }
}
