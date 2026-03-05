import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { OrderService } from '../../api/api/order.service';
import { Order } from '../../api/model/order';
import { OrderDto } from '../../api/model/orderDto';
import { CustomerBasicInfoSchema } from '../../api/model/customerBasicInfoSchema';
import { resolveApiBasePath } from '../../api-base-path';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent {
  private readonly orderService = inject(OrderService);
  private readonly httpClient = inject(HttpClient);

  private readonly defaultPageSize = 5;
  private customerInfoAccessDenied = false;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly orders = signal<OrderDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly customerNameById = signal<Record<number, string>>({});
  protected readonly createPayload = signal(this.stringifyPayload(this.createSampleOrderPayload()));
  protected readonly editPayload = signal(this.stringifyPayload(this.createSampleOrderPayload()));
  protected readonly isCreating = signal(false);
  protected readonly isUpdating = signal(false);
  protected readonly createMessage = signal<string | null>(null);
  protected readonly updateMessage = signal<string | null>(null);
  protected readonly editingOrderId = signal<number | null>(null);

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

  protected createOrder(): void {
    const payload = this.parsePayload(this.createPayload(), 'create');
    if (!payload) {
      return;
    }

    this.isCreating.set(true);
    this.createMessage.set(null);

    this.orderService.apiOrderCreatePost(payload).subscribe({
      next: () => {
        this.createMessage.set('Order created successfully.');
        this.isCreating.set(false);
        this.loadOrders(0);
      },
      error: (error: HttpErrorResponse) => {
        this.createMessage.set(`Create failed: ${this.resolveErrorMessage(error)}`);
        this.isCreating.set(false);
      }
    });
  }

  protected startEditing(order: OrderDto): void {
    const source = this.mapOrderDtoToOrder(order);
    this.editingOrderId.set(source.id ?? null);
    this.editPayload.set(this.stringifyPayload(source));
    this.updateMessage.set(null);
  }

  protected cancelEditing(): void {
    this.editingOrderId.set(null);
    this.updateMessage.set(null);
  }

  protected updateOrder(): void {
    const payload = this.parsePayload(this.editPayload(), 'update');
    if (!payload) {
      return;
    }

    this.isUpdating.set(true);
    this.updateMessage.set(null);

    this.orderService.apiOrderUpdatePut(payload).subscribe({
      next: () => {
        this.updateMessage.set('Order updated successfully.');
        this.isUpdating.set(false);
        this.loadOrders(this.currentPage());
      },
      error: (error: HttpErrorResponse) => {
        this.updateMessage.set(`Update failed: ${this.resolveErrorMessage(error)}`);
        this.isUpdating.set(false);
      }
    });
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
      return '';
    }

    return this.customerNameById()[customerId] ?? '';
  }

  private loadCustomerNamesForOrders(orders: OrderDto[]): void {
    const idsToFetch = [...new Set(orders.map((order) => order.customerId).filter((id): id is number => typeof id === 'number'))]
      .filter((id) => !this.customerNameById()[id]);

    if (idsToFetch.length === 0 || this.customerInfoAccessDenied) {
      return;
    }

    const requests = idsToFetch.map((customerId) =>
      this.getCustomerInfo(customerId).pipe(
        map((response) => {
          const customerInfo = response.customerBasicInfo;
          const customerName = customerInfo?.customerName?.trim() || customerInfo?.userName?.trim() || '';

          return {
            customerId,
            customerName
          };
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.customerInfoAccessDenied = true;
          }

          return of({ customerId, customerName: '' });
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

  private getCustomerInfo(customerId: number) {
    return this.httpClient.get<CustomerBasicInfoSchema>(`${resolveApiBasePath()}/api/Customer/GetCustomerInfo`, {
      params: { UserId: customerId }
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

  private parsePayload(value: string, action: 'create' | 'update'): Order | null {
    try {
      const parsed = JSON.parse(value) as Order;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Payload must be a JSON object.');
      }

      if (action === 'update' && (typeof parsed.id !== 'number' || Number.isNaN(parsed.id))) {
        throw new Error('Update payload must include a numeric id.');
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON payload.';

      if (action === 'create') {
        this.createMessage.set(`Create failed: ${message}`);
      } else {
        this.updateMessage.set(`Update failed: ${message}`);
      }

      return null;
    }
  }

  private stringifyPayload(payload: Order): string {
    return JSON.stringify(payload, null, 2);
  }

  private createSampleOrderPayload(): Order {
    return {
      id: 0,
      keyUsage: 'string',
      amountPaid: 0,
      symbol: 'string',
      customerId: 0,
      creditCount: 0,
      orderGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      storeId: 0,
      billingAddressId: 0,
      orderStatusId: 0,
      paymentStatusId: 0,
      paymentMethodSystemName: 'string',
      customerCurrencyCode: 'string',
      currencyRate: 0,
      orderSubTotalDiscountInclTax: 0,
      orderSubTotalDiscountExclTax: 0,
      orderDiscount: 0,
      orderTotal: 0,
      paidDateUtc: '2026-03-05T18:38:40.404Z',
      createdOnUtc: '2026-03-05T18:38:40.404Z',
      customOrderNumber: 'string',
      redeemedCoinsEntryId: 0,
      productType: 'string',
      paymentType: 'string',
      productAttributeId: 0,
      advisorId: 0,
      orderTax: 0,
      orderStatus: 10,
      paymentStatus: 10
    };
  }

  private mapOrderDtoToOrder(order: OrderDto): Order {
    return {
      ...this.createSampleOrderPayload(),
      ...order,
      id: order.id ?? 0,
      paidDateUtc: order.paidDateUtc ?? '2026-03-05T18:38:58.053Z',
      createdOnUtc: order.createdOnUtc ?? '2026-03-05T18:38:58.053Z',
      orderStatus: order.orderStatus ?? 10,
      paymentStatus: order.paymentStatus ?? 10,
      creditCount: 0,
      productAttributeId: 0,
      orderTax: 0
    };
  }
}
