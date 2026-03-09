import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProductDto } from '../../api/model/productDto';
import { resolveApiBasePath } from '../../api-base-path';

type ProductResponse = {
  productDto?: ProductDto;
  isSuccess?: boolean;
  message?: string | null;
};

type ProductFormModel = {
  id: number;
  name: string;
  shortDescription: string;
  fullDescription: string;
  productTypeId: number;
  price: number;
  published: boolean;
  deleted: boolean;
};

@Component({
  selector: 'app-product-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './product-form-page.component.html',
  styleUrl: './product-form-page.component.scss'
})
export class ProductFormPageComponent implements OnInit {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'configuration/products/edit/:id');

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: ProductFormModel = {
    id: 0,
    name: '',
    shortDescription: '',
    fullDescription: '',
    productTypeId: 0,
    price: 0,
    published: true,
    deleted: false
  };

  ngOnInit(): void {
    if (!this.isEditMode()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.submitError.set('Invalid product id for edit.');
      return;
    }

    this.isLoading.set(true);
    this.httpClient.get<ProductResponse>(`${resolveApiBasePath()}/api/Product/${id}`).subscribe({
      next: (response) => {
        const dto = response.productDto;
        if (!dto) {
          this.submitError.set('Unable to load product details.');
          this.isLoading.set(false);
          return;
        }

        this.formModel = {
          id: dto.id ?? id,
          name: dto.name ?? '',
          shortDescription: dto.shortDescription ?? '',
          fullDescription: dto.fullDescription ?? '',
          productTypeId: dto.productTypeId ?? 0,
          price: dto.price ?? 0,
          published: dto.published ?? true,
          deleted: dto.deleted ?? false
        };
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, 'Unable to load product details right now.'));
        this.isLoading.set(false);
      }
    });
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload = this.buildPayload();

    const request$ = this.isEditMode()
      ? this.httpClient.post<ProductResponse>(`${resolveApiBasePath()}/api/Product/Update`, payload)
      : this.httpClient.post<ProductResponse>(`${resolveApiBasePath()}/api/Product/Create`, payload);

    request$.subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(response.message?.trim() || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(this.isEditMode() ? 'Product updated successfully.' : 'Product created successfully.');
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/configuration/products']);
        }, 600);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, this.defaultErrorMessage()));
        this.isSubmitting.set(false);
      }
    });
  }

  private buildPayload(): ProductDto {
    return {
      ...this.defaultPayloadValues(),
      id: this.toSafeNumber(this.formModel.id),
      name: this.toSafeString(this.formModel.name),
      shortDescription: this.toSafeString(this.formModel.shortDescription),
      fullDescription: this.toSafeString(this.formModel.fullDescription),
      productTypeId: this.toSafeNumber(this.formModel.productTypeId),
      price: this.toSafeNumber(this.formModel.price),
      published: this.formModel.published,
      deleted: this.formModel.deleted
    };
  }

  private defaultPayloadValues(): ProductDto {
    const now = new Date().toISOString();

    return {
      id: 0,
      name: null,
      shortDescription: null,
      fullDescription: null,
      productTypeId: 0,
      parentGroupedProductId: 0,
      visibleIndividually: true,
      adminComment: null,
      productTemplateId: 0,
      vendorId: 0,
      showOnHomepage: false,
      metaKeywords: null,
      metaDescription: null,
      metaTitle: null,
      allowCustomerReviews: true,
      approvedRatingSum: 0,
      notApprovedRatingSum: 0,
      approvedTotalReviews: 0,
      notApprovedTotalReviews: 0,
      subjectToAcl: false,
      limitedToStores: false,
      sku: null,
      manufacturerPartNumber: null,
      gtin: null,
      isGiftCard: false,
      giftCardTypeId: 0,
      overriddenGiftCardAmount: 0,
      requireOtherProducts: false,
      requiredProductIds: null,
      automaticallyAddRequiredProducts: false,
      isDownload: false,
      downloadId: 0,
      unlimitedDownloads: false,
      maxNumberOfDownloads: 0,
      downloadExpirationDays: 0,
      downloadActivationTypeId: 0,
      hasSampleDownload: false,
      sampleDownloadId: 0,
      hasUserAgreement: false,
      userAgreementText: null,
      isRecurring: false,
      recurringCycleLength: 0,
      recurringCyclePeriodId: 0,
      recurringTotalCycles: 0,
      isRental: false,
      rentalPriceLength: 0,
      rentalPricePeriodId: 0,
      isShipEnabled: false,
      isFreeShipping: false,
      shipSeparately: false,
      additionalShippingCharge: 0,
      deliveryDateId: 0,
      isTaxExempt: false,
      taxCategoryId: 0,
      isTelecommunicationsOrBroadcastingOrElectronicServices: false,
      manageInventoryMethodId: 0,
      productAvailabilityRangeId: 0,
      useMultipleWarehouses: false,
      warehouseId: 0,
      stockQuantity: 0,
      displayStockAvailability: false,
      displayStockQuantity: false,
      minStockQuantity: 0,
      lowStockActivityId: 0,
      notifyAdminForQuantityBelow: 0,
      backorderModeId: 0,
      allowBackInStockSubscriptions: false,
      orderMinimumQuantity: 0,
      orderMaximumQuantity: 0,
      allowedQuantities: null,
      allowAddingOnlyExistingAttributeCombinations: false,
      notReturnable: false,
      disableBuyButton: false,
      disableWishlistButton: false,
      availableForPreOrder: false,
      preOrderAvailabilityStartDateTimeUtc: null,
      callForPrice: false,
      price: 0,
      oldPrice: 0,
      productCost: 0,
      customerEntersPrice: false,
      minimumCustomerEnteredPrice: 0,
      maximumCustomerEnteredPrice: 0,
      basepriceEnabled: false,
      basepriceAmount: 0,
      basepriceUnitId: 0,
      basepriceBaseAmount: 0,
      basepriceBaseUnitId: 0,
      markAsNew: false,
      markAsNewStartDateTimeUtc: null,
      markAsNewEndDateTimeUtc: null,
      hasTierPrices: false,
      hasDiscountsApplied: false,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      availableStartDateTimeUtc: null,
      availableEndDateTimeUtc: null,
      displayOrder: 0,
      published: true,
      deleted: false,
      createdOnUtc: now,
      updatedOnUtc: now,
      distance: 0,
      category: 0,
      categoryType: null,
      actualPrice: 0,
      inItQuantity: null,
      productQuantity: null
    };
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }

  private defaultErrorMessage(): string {
    return this.isEditMode() ? 'Unable to update product right now.' : 'Unable to create product right now.';
  }

  private toSafeString(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
