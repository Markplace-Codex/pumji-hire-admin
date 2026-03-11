import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OrderService } from '../../api/api/order.service';
import { Order } from '../../api/model/order';



type OrderStatusOption = {
  value: number;
  label: string;
};

type PaymentStatusOption = {
  value: number;
  label: string;
};

type ShoppingCartItemTypeOption = {
  value: number;
  label: string;
};

type PaymentTypeOption = {
  value: number;
  label: string;
};

type OrderFormModel = {
  id: number;
  keyUsage: string;
  amountPaid: number;
  symbol: string;
  customerId: number;
  creditCount: number;
  orderGuid: string;
  storeId: number;
  billingAddressId: number;
  paymentMethodSystemName: string;
  customerCurrencyCode: string;
  currencyRate: number;
  orderSubTotalDiscountInclTax: number;
  orderSubTotalDiscountExclTax: number;
  orderDiscount: number;
  orderTotal: number;
  paidDateUtc: string;
  createdOnUtc: string;
  customOrderNumber: string;
  redeemedCoinsEntryId: number;
  productType: number;
  paymentType: number;
  productAttributeId: number;
  advisorId: number;
  orderTax: number;
  orderStatus: number;
  paymentStatus: number;
};

@Component({
  selector: 'app-order-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './order-form-page.component.html',
  styleUrl: './order-form-page.component.scss'
})
export class OrderFormPageComponent {
  private readonly defaultAdvisorId = 0;
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'orders/edit');

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected readonly includePaidDateUtc = signal(true);
  protected readonly includeCreatedOnUtc = signal(true);

  protected readonly orderStatusOptions: OrderStatusOption[] = [
    { value: 10, label: 'Pending' },
    { value: 20, label: 'Processing' },
    { value: 30, label: 'Complete' },
    { value: 40, label: 'Cancelled' },
    { value: 50, label: 'Out For Delivery' },
    { value: 60, label: 'Attempt Failed' }
  ];

  protected readonly paymentStatusOptions: PaymentStatusOption[] = [
    { value: 10, label: 'Pending' },
    { value: 20, label: 'Authorized' },
    { value: 30, label: 'Paid' },
    { value: 35, label: 'Partially Refunded' },
    { value: 40, label: 'Refunded' },
    { value: 50, label: 'Voided' },
    { value: 60, label: 'Failed' },
    { value: 70, label: 'Cancelled' }
  ];

  protected readonly shoppingCartItemTypeOptions: ShoppingCartItemTypeOption[] = [
    { value: 1, label: 'Credits' },
    { value: 2, label: 'Resume' },
    { value: 3, label: 'InterviewPackage' },
    { value: 4, label: 'SubAdminAccess' }
  ];

  protected readonly paymentTypeOptions: PaymentTypeOption[] = [
    { value: 1, label: 'UPI' },
    { value: 2, label: 'COD' },
    { value: 3, label: 'Credits' }
  ];

  protected formModel: OrderFormModel = this.createDefaultFormModel();

  constructor() {
    if (this.isEditMode()) {
      const stateOrder = this.router.getCurrentNavigation()?.extras.state?.['order'] as Order | undefined;
      if (!stateOrder) {
        this.submitError.set('No order data received for edit. Please click Edit from the Orders list.');
      } else {
        this.formModel = this.mapOrderToFormModel(stateOrder);
        this.includePaidDateUtc.set(this.formModel.paidDateUtc.length > 0);
        this.includeCreatedOnUtc.set(this.formModel.createdOnUtc.length > 0);
      }
    }
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload = this.buildPayload();
    const request$ = this.isEditMode()
      ? this.orderService.apiOrderUpdatePut(payload)
      : this.orderService.apiOrderCreatePost(payload);

    request$.subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(this.sanitizeMessage(response.message) || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(this.isEditMode() ? 'Order updated successfully.' : 'Order created successfully.');
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 600);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error));
        this.isSubmitting.set(false);
      }
    });
  }

  protected applySampleData(): void {
    this.formModel = this.createDefaultFormModel();
    this.includePaidDateUtc.set(true);
    this.includeCreatedOnUtc.set(true);
  }

  private buildPayload(): Order {
    const model = this.formModel;
    const customerIdFromLogin = this.getLoggedInCustomerId();

    return {
      id: model.id,
      keyUsage: model.keyUsage || null,
      amountPaid: this.toNumberOrZero(model.amountPaid),
      symbol: model.symbol || null,
      customerId: customerIdFromLogin ?? model.customerId,
      creditCount: model.creditCount,
      orderGuid: model.orderGuid,
      storeId: model.storeId,
      billingAddressId: model.billingAddressId,
      orderStatusId: model.orderStatus,
      paymentStatusId: model.paymentStatus,
      paymentMethodSystemName: model.paymentMethodSystemName || null,
      customerCurrencyCode: model.customerCurrencyCode || null,
      currencyRate: model.currencyRate,
      orderSubTotalDiscountInclTax: model.orderSubTotalDiscountInclTax,
      orderSubTotalDiscountExclTax: model.orderSubTotalDiscountExclTax,
      orderDiscount: model.orderDiscount,
      orderTotal: this.toNumberOrZero(model.orderTotal),
      paidDateUtc: this.includePaidDateUtc() ? this.localToIsoString(model.paidDateUtc) : null,
      createdOnUtc: this.includeCreatedOnUtc() ? this.localToIsoString(model.createdOnUtc) : undefined,
      customOrderNumber: model.customOrderNumber || null,
      redeemedCoinsEntryId: model.redeemedCoinsEntryId,
      productType: this.getShoppingCartItemTypeLabel(model.productType),
      paymentType: this.getPaymentTypeLabel(model.paymentType),
      productAttributeId: model.productAttributeId,
      advisorId: this.defaultAdvisorId,
      orderTax: model.orderTax,
      orderStatus: model.orderStatus as any,
      paymentStatus: model.paymentStatus as any
    };
  }

  private createDefaultFormModel(): OrderFormModel {
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
      paymentMethodSystemName: 'string',
      customerCurrencyCode: 'string',
      currencyRate: 0,
      orderSubTotalDiscountInclTax: 0,
      orderSubTotalDiscountExclTax: 0,
      orderDiscount: 0,
      orderTotal: 0,
      paidDateUtc: this.isoToLocalInput('2026-03-05T18:38:40.404Z'),
      createdOnUtc: this.isoToLocalInput('2026-03-05T18:38:40.404Z'),
      customOrderNumber: 'string',
      redeemedCoinsEntryId: 0,
      productType: 1,
      paymentType: 1,
      productAttributeId: 0,
      advisorId: this.defaultAdvisorId,
      orderTax: 0,
      orderStatus: 10,
      paymentStatus: 10
    };
  }

  private mapOrderToFormModel(order: Order): OrderFormModel {
    const defaults = this.createDefaultFormModel();

    return {
      ...defaults,
      id: order.id ?? defaults.id,
      keyUsage: order.keyUsage ?? '',
      amountPaid: order.amountPaid ?? defaults.amountPaid,
      symbol: order.symbol ?? '',
      customerId: order.customerId ?? defaults.customerId,
      creditCount: order.creditCount ?? defaults.creditCount,
      orderGuid: order.orderGuid ?? defaults.orderGuid,
      storeId: order.storeId ?? defaults.storeId,
      billingAddressId: order.billingAddressId ?? defaults.billingAddressId,
      paymentMethodSystemName: order.paymentMethodSystemName ?? '',
      customerCurrencyCode: order.customerCurrencyCode ?? '',
      currencyRate: order.currencyRate ?? defaults.currencyRate,
      orderSubTotalDiscountInclTax: order.orderSubTotalDiscountInclTax ?? defaults.orderSubTotalDiscountInclTax,
      orderSubTotalDiscountExclTax: order.orderSubTotalDiscountExclTax ?? defaults.orderSubTotalDiscountExclTax,
      orderDiscount: order.orderDiscount ?? defaults.orderDiscount,
      orderTotal: order.orderTotal ?? defaults.orderTotal,
      paidDateUtc: this.isoToLocalInput(order.paidDateUtc),
      createdOnUtc: this.isoToLocalInput(order.createdOnUtc),
      customOrderNumber: order.customOrderNumber ?? '',
      redeemedCoinsEntryId: order.redeemedCoinsEntryId ?? defaults.redeemedCoinsEntryId,
      productType: this.parseShoppingCartItemTypeValue(order.productType, defaults.productType),
      paymentType: this.parsePaymentTypeValue(order.paymentType, defaults.paymentType),
      productAttributeId: order.productAttributeId ?? defaults.productAttributeId,
      advisorId: order.advisorId ?? defaults.advisorId,
      orderTax: order.orderTax ?? defaults.orderTax,
      orderStatus: (order.orderStatus as unknown as number) ?? order.orderStatusId ?? defaults.orderStatus,
      paymentStatus: (order.paymentStatus as unknown as number) ?? order.paymentStatusId ?? defaults.paymentStatus
    };
  }

  private isoToLocalInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (unit: number): string => unit.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private localToIsoString(value: string): string {
    return value ? new Date(value).toISOString() : '';
  }

  private toNumberOrZero(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private parseShoppingCartItemTypeValue(value: string | null | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const fromLabel = this.shoppingCartItemTypeOptions.find((option) => option.label.toLowerCase() === value.toLowerCase());
    if (fromLabel) {
      return fromLabel.value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parsePaymentTypeValue(value: string | null | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const fromLabel = this.paymentTypeOptions.find((option) => option.label.toLowerCase() === value.toLowerCase());
    if (fromLabel) {
      return fromLabel.value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getShoppingCartItemTypeLabel(value: number): string | null {
    return this.shoppingCartItemTypeOptions.find((option) => option.value === value)?.label ?? null;
  }

  private getPaymentTypeLabel(value: number): string | null {
    return this.paymentTypeOptions.find((option) => option.value === value)?.label ?? null;
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      const sanitizedMessage = this.sanitizeMessage(message);
      if (sanitizedMessage) {
        return sanitizedMessage;
      }
    }

    return this.defaultErrorMessage();
  }

  private sanitizeMessage(message: unknown): string | null {
    if (typeof message !== 'string') {
      return null;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return null;
    }

    const normalizedMessage = trimmedMessage.toLowerCase();
    if (normalizedMessage.includes('/api/') || normalizedMessage.includes('endpoint')) {
      return null;
    }

    return trimmedMessage;
  }

  private defaultErrorMessage(): string {
    return this.isEditMode() ? 'Unable to update order right now.' : 'Unable to create order right now.';
  }

  private getLoggedInCustomerId(): number | null {
    const loginResponseRaw = localStorage.getItem('loginResponse');
    if (!loginResponseRaw) {
      return null;
    }

    try {
      const parsed = JSON.parse(loginResponseRaw) as { authenticateResponse?: { customerId?: unknown } };
      const customerId = parsed.authenticateResponse?.customerId;

      return typeof customerId === 'number' && Number.isFinite(customerId) ? customerId : null;
    } catch {
      return null;
    }
  }
}
