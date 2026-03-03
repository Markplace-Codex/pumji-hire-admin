import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CustomerService } from '../../api/api/customer.service';
import { OrderService } from '../../api/api/order.service';
import { OrderDto } from '../../api/model/orderDto';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent {
  private readonly orderService = inject(OrderService);
  private readonly customerService = inject(CustomerService);

  private readonly defaultPageSize = 5;

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

    if (idsToFetch.length === 0) {
      return;
    }

    const requests = idsToFetch.map((userId) =>
      this.customerService.apiCustomerGetCustomerInfoGet(userId).pipe(
        map((response) => {
<<<<<<< codex/integrate-orders-page-with-api-data-2jbnn7
          const responsePayload = response as {
            customerInfoModelDto?: { firstName?: string | null; lastName?: string | null };
            customerBasicInfo?: { customerName?: string | null };
          };

          const customerInfoModelName = [
            responsePayload.customerInfoModelDto?.firstName?.trim(),
            responsePayload.customerInfoModelDto?.lastName?.trim()
          ]
            .filter((name): name is string => !!name)
            .join(' ')
            .trim();

          const customerBasicInfoName = responsePayload.customerBasicInfo?.customerName?.trim();
          const customerName = customerInfoModelName || customerBasicInfoName;

=======
          const customerName = response.customerBasicInfo?.customerName?.trim();
>>>>>>> Sravani/Admin
          return {
            userId,
            customerName: customerName && customerName.length > 0 ? customerName : `Customer #${userId}`
          };
        }),
        catchError(() => of({ userId, customerName: `Customer #${userId}` }))
      )
    );

    forkJoin(requests).subscribe((results) => {
      const existing = this.customerNameById();
      const updated: Record<number, string> = { ...existing };

      for (const result of results) {
        updated[result.userId] = result.customerName;
      }

      this.customerNameById.set(updated);
    });
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
