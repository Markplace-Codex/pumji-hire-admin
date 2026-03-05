import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OrderService } from '../../api/api/order.service';
import { Order } from '../../api/model/order';

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
  orderStatusId: number;
  paymentStatusId: number;
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
  productType: string;
  paymentType: string;
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
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'orders/edit');

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected readonly includePaidDateUtc = signal(true);
  protected readonly includeCreatedOnUtc = signal(true);

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
          this.submitError.set(response.message?.trim() || this.defaultErrorMessage());
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

    return {
      id: model.id,
      keyUsage: model.keyUsage || null,
      amountPaid: model.amountPaid,
      symbol: model.symbol || null,
      customerId: model.customerId,
      creditCount: model.creditCount,
      orderGuid: model.orderGuid,
      storeId: model.storeId,
      billingAddressId: model.billingAddressId,
      orderStatusId: model.orderStatusId,
      paymentStatusId: model.paymentStatusId,
      paymentMethodSystemName: model.paymentMethodSystemName || null,
      customerCurrencyCode: model.customerCurrencyCode || null,
      currencyRate: model.currencyRate,
      orderSubTotalDiscountInclTax: model.orderSubTotalDiscountInclTax,
      orderSubTotalDiscountExclTax: model.orderSubTotalDiscountExclTax,
      orderDiscount: model.orderDiscount,
      orderTotal: model.orderTotal,
      paidDateUtc: this.includePaidDateUtc() ? this.localToIsoString(model.paidDateUtc) : null,
      createdOnUtc: this.includeCreatedOnUtc() ? this.localToIsoString(model.createdOnUtc) : undefined,
      customOrderNumber: model.customOrderNumber || null,
      redeemedCoinsEntryId: model.redeemedCoinsEntryId,
      productType: model.productType || null,
      paymentType: model.paymentType || null,
      productAttributeId: model.productAttributeId,
      advisorId: model.advisorId,
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
      orderStatusId: 0,
      paymentStatusId: 0,
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
      productType: 'string',
      paymentType: 'string',
      productAttributeId: 0,
      advisorId: 0,
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
      orderStatusId: order.orderStatusId ?? defaults.orderStatusId,
      paymentStatusId: order.paymentStatusId ?? defaults.paymentStatusId,
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
      productType: order.productType ?? '',
      paymentType: order.paymentType ?? '',
      productAttributeId: order.productAttributeId ?? defaults.productAttributeId,
      advisorId: order.advisorId ?? defaults.advisorId,
      orderTax: order.orderTax ?? defaults.orderTax,
      orderStatus: (order.orderStatus as unknown as number) ?? defaults.orderStatus,
      paymentStatus: (order.paymentStatus as unknown as number) ?? defaults.paymentStatus
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

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return this.defaultErrorMessage();
  }

  private defaultErrorMessage(): string {
    return this.isEditMode() ? 'Unable to update order right now.' : 'Unable to create order right now.';
  }
}
