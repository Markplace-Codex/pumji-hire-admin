import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type ComplianceDocumentItem = {
  id?: number;
  name?: string;
  type?: string;
  documentVersion?: string;
  isActive?: boolean;
};

type ComplianceDocumentPagination = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type ComplianceDocumentApiResponse = {
  paginationComplianceDocumentVersion?: {
    pagination?: ComplianceDocumentPagination;
    complianceDocumentVersions?: ComplianceDocumentItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-consent-page',
  imports: [RouterLink],
  templateUrl: './consent-page.component.html',
  styleUrl: './consent-page.component.scss'
})
export class ConsentPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly defaultPageSize = 10;
  private apiPageIndexOffset = 0;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly documents = signal<ComplianceDocumentItem[]>([]);
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
    this.loadDocuments(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadDocuments(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadDocuments(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadDocuments(this.currentPage());
  }

  private loadDocuments(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const apiPageIndex = pageIndex + this.apiPageIndexOffset;

    this.httpClient
      .get<ComplianceDocumentApiResponse>(`${resolveApiBasePath()}/api/ComplianceDocument/GetAll`, {
        params: { pageIndex: apiPageIndex, pageSize: this.defaultPageSize }
      })
      .subscribe({
        next: (response) => {
          if (response.isSuccess === false) {
            this.errorMessage.set(response.message?.trim() || 'Failed to load consent documents.');
            this.documents.set([]);
            this.totalCount.set(0);
            this.currentPage.set(pageIndex);
            this.totalPages.set(0);
            this.isLoading.set(false);
            return;
          }

          const pageData = response.paginationComplianceDocumentVersion?.pagination;
          const documents = response.paginationComplianceDocumentVersion?.complianceDocumentVersions ?? [];
          const totalPages = pageData?.totalPages ?? 0;

          this.updateApiPageIndexOffset(pageData?.currentPage, pageIndex);
          const currentPage = this.resolveCurrentPage(pageData?.currentPage, pageIndex, totalPages);

          this.documents.set(documents);
          this.totalCount.set(pageData?.totalCount ?? documents.length);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(currentPage);
          this.totalPages.set(totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private updateApiPageIndexOffset(currentPage: number | undefined, requestedPageIndex: number): void {
    if (typeof currentPage !== 'number') {
      return;
    }

    if (currentPage === requestedPageIndex + 1) {
      this.apiPageIndexOffset = 1;
      return;
    }

    if (currentPage === requestedPageIndex) {
      this.apiPageIndexOffset = 0;
    }
  }

  private resolveCurrentPage(
    currentPageFromApi: number | undefined,
    requestedPageIndex: number,
    totalPages: number
  ): number {
    if (typeof currentPageFromApi !== 'number') {
      return requestedPageIndex;
    }

    const normalizedPage = currentPageFromApi - this.apiPageIndexOffset;
    if (normalizedPage >= 0 && (totalPages === 0 || normalizedPage < totalPages)) {
      return normalizedPage;
    }

    return requestedPageIndex;
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

    return `Failed to load consent documents (HTTP ${error.status || 'unknown'}).`;
  }
}
