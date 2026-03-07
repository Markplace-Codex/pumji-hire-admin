import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { OrderService } from '../../api/api/order.service';
import { OrderDto } from '../../api/model/orderDto';
import { CustomerBasicInfoSchema } from '../../api/model/customerBasicInfoSchema';
import { PaginationOrderSchema } from '../../api/model/paginationOrderSchema';
import { resolveApiBasePath } from '../../api-base-path';

interface OrdersSearchPayload {
  customerName: string | string[];
  paymentType: string | string[];
  amountPaid: string | string[];
  status: string | string[];
  createdOn?: string | string[];
}

type OrdersApiResponse = PaginationOrderSchema & {
  orderDto?: OrderDto[];
  orders?: OrderDto[];
  order?: OrderDto[];
};

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent {
  private readonly orderService = inject(OrderService);
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

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
  protected readonly isFilterActive = signal(false);

  protected readonly filterForm = this.formBuilder.group({
    customerName: [''],
    paymentType: [''],
    amountPaid: [''],
    status: [''],
    createdOn: ['']
  });

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
    if (!this.hasPreviousPage() || this.isLoading() || this.isFilterActive()) {
      return;
    }

    this.loadOrders(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading() || this.isFilterActive()) {
      return;
    }

    this.loadOrders(this.currentPage() + 1);
  }

  protected retry(): void {
    if (this.isFilterActive()) {
      this.searchOrders();
      return;
    }

    this.loadOrders(this.currentPage());
  }

  protected applyFilters(): void {
    this.searchOrders();
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      customerName: '',
      paymentType: '',
      amountPaid: '',
      status: '',
      createdOn: ''
    });
    this.isFilterActive.set(false);
    this.loadOrders(0);
  }

  protected navigateToAddOrder(): void {
    this.router.navigate(['/orders/add']);
  }

  protected navigateToEditOrder(order: OrderDto): void {
    this.router.navigate(['/orders/edit'], {
      state: { order }
    });
  }

  private loadOrders(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.apiOrderGetAllGet(pageIndex, this.pageSize()).subscribe({
      next: (response) => {
        const pageData = response.paginationOrder?.pagination;
        const orderList = this.extractOrders(response);

        this.orders.set(orderList);
        this.totalCount.set(pageData?.totalCount ?? orderList.length);
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

  private searchOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = this.buildSearchPayload();
    this.isFilterActive.set(this.hasActiveFilters(payload));

    this.httpClient.post<OrdersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/OrdersSearch`, payload).subscribe({
      next: (response) => {
        const pageData = response.paginationOrder?.pagination;
        const orderList = this.extractOrders(response);

        this.orders.set(orderList);
        this.totalCount.set(pageData?.totalCount ?? orderList.length);
        this.pageSize.set(pageData?.pageSize ?? Math.max(orderList.length, this.defaultPageSize));
        this.currentPage.set(pageData?.currentPage ?? 0);
        this.totalPages.set(pageData?.totalPages ?? (orderList.length > 0 ? 1 : 0));
        this.loadCustomerNamesForOrders(this.orders());
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  private buildSearchPayload(): OrdersSearchPayload {
    const raw = this.filterForm.getRawValue();
    const payload: OrdersSearchPayload = {
      customerName: this.toSingleOrMultiValue(raw.customerName) ?? '',
      paymentType: this.toSingleOrMultiValue(raw.paymentType) ?? '',
      amountPaid: this.toSingleOrMultiValue(raw.amountPaid) ?? '',
      status: this.toSingleOrMultiValue(raw.status) ?? ''
    };

    const createdOn = this.toSingleOrMultiValue(raw.createdOn, true);
    if (createdOn !== undefined) {
      payload.createdOn = createdOn;
    }

    return payload;
  }

  private toSingleOrMultiValue(value: unknown, omitWhenEmpty = false): string | string[] | undefined {
    const normalized = this.normalizeText(value)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (normalized.length === 0) {
      return omitWhenEmpty ? undefined : '';
    }

    return normalized.length === 1 ? normalized[0] : normalized;
  }

  private normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return value.toString().trim();
    }

    return '';
  }

  private hasActiveFilters(payload: OrdersSearchPayload): boolean {
    return (
      this.hasValue(payload.customerName) ||
      this.hasValue(payload.paymentType) ||
      this.hasValue(payload.status) ||
      this.hasValue(payload.amountPaid) ||
      this.hasValue(payload.createdOn)
    );
  }

  private hasValue(value: string | string[] | undefined): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === 'string' && value.trim().length > 0;
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
          const customerName = customerInfo?.customerName?.trim() || '';

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

  private extractOrders(response: OrdersApiResponse): OrderDto[] {
    return response.paginationOrder?.orderDto ?? response.orderDto ?? response.orders ?? response.order ?? [];
  }
}
