import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type ProductItem = {
  id?: number;
  name?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price?: number;
};

type PaginationDetails = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type ProductsApiResponse = {
  paginationProducts?: {
    pagination?: PaginationDetails;
    productsDtos?: ProductItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-products-page',
  imports: [RouterLink],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss'
})
export class ProductsPageComponent {
  private readonly httpClient = inject(HttpClient);

  private readonly defaultPageSize = 10;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly products = signal<ProductItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.currentPage() + 1} of ${this.totalPages()}`;
  });

  constructor() {
    this.loadProducts(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadProducts(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadProducts(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadProducts(this.currentPage());
  }

  private loadProducts(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<ProductsApiResponse>(`${resolveApiBasePath()}/api/Product/GetAllProducts`, {
        params: {
          pageIndex,
          pageSize: this.defaultPageSize
        }
      })
      .subscribe({
        next: (response) => {
          const pageData = response.paginationProducts?.pagination;
          const productItems = response.paginationProducts?.productsDtos ?? [];

          this.products.set(productItems);
          this.totalCount.set(pageData?.totalCount ?? productItems.length);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.products.set([]);
          this.isLoading.set(false);
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const serverMessage =
      typeof error.error === 'object' && error.error !== null && 'message' in error.error
        ? String(error.error.message)
        : null;

    if (serverMessage && serverMessage.trim().length > 0) {
      return serverMessage;
    }

    return 'Unable to load products. Please try again.';
  }
}
