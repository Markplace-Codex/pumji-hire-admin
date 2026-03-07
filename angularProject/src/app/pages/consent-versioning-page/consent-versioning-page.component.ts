import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type AcceptanceHistoryItem = {
  id?: number;
  userId?: number;
  name?: string;
  type?: string;
  documentVersion?: string;
  isAccepted?: boolean;
  acceptedOn?: string;
  ipSignature?: string;
  deviceInfo?: string;
  locationInfo?: string;
  actionId?: number;
};

type AcceptanceHistoryPagination = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type AcceptanceHistoryApiResponse = {
  acceptanceHistoryListResponses?: {
    pagination?: AcceptanceHistoryPagination;
    acceptanceHistories?: AcceptanceHistoryItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-consent-versioning-page',
  imports: [RouterLink],
  templateUrl: './consent-versioning-page.component.html',
  styleUrl: './consent-versioning-page.component.scss'
})
export class ConsentVersioningPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly defaultPageSize = 10;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly acceptanceHistories = signal<AcceptanceHistoryItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() =>
    this.totalPages() === 0 ? 'Page 0 of 0' : `Page ${this.currentPage() + 1} of ${this.totalPages()}`
  );

  constructor() {
    this.loadAcceptanceHistories(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadAcceptanceHistories(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadAcceptanceHistories(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadAcceptanceHistories(this.currentPage());
  }

  private loadAcceptanceHistories(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<AcceptanceHistoryApiResponse>(`${resolveApiBasePath()}/api/AcceptanceHistory/GetAll`, {
        params: { pageIndex, pageSize: this.defaultPageSize }
      })
      .subscribe({
        next: (response) => {
          if (response.isSuccess === false) {
            this.errorMessage.set(response.message?.trim() || 'Failed to load consent versioning data.');
            this.acceptanceHistories.set([]);
            this.totalCount.set(0);
            this.currentPage.set(pageIndex);
            this.totalPages.set(0);
            this.isLoading.set(false);
            return;
          }

          const pageData = response.acceptanceHistoryListResponses?.pagination;
          const histories = response.acceptanceHistoryListResponses?.acceptanceHistories ?? [];

          this.acceptanceHistories.set(histories);
          this.totalCount.set(pageData?.totalCount ?? histories.length);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your network and API availability.';
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    return `Failed to load consent versioning data (HTTP ${error.status || 'unknown'}).`;
  }
}
