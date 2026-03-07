import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type ErrorLogItem = {
  id?: number;
  logDate?: string;
  logLevel?: string;
  logger?: string;
  message?: string;
  exception?: string;
  userId?: number;
  customerName?: string | null;
  requestId?: string;
};

type ErrorLogsPagination = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type ErrorLogsApiResponse = {
  errorLogListResponses?: {
    pagination?: ErrorLogsPagination;
    errorLogs?: ErrorLogItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-error-logs-page',
  imports: [RouterLink],
  templateUrl: './error-logs-page.component.html',
  styleUrl: './error-logs-page.component.scss'
})
export class ErrorLogsPageComponent {
  private readonly httpClient = inject(HttpClient);

  private readonly defaultPageSize = 5;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly errorLogs = signal<ErrorLogItem[]>([]);
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
    this.loadErrorLogs(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadErrorLogs(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadErrorLogs(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadErrorLogs(this.currentPage());
  }

  private loadErrorLogs(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<ErrorLogsApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetAllErrorLogs`, {
        params: {
          pageNumber: pageIndex,
          pageSize: this.pageSize()
        }
      })
      .subscribe({
        next: (response) => {
          const pageData = response.errorLogListResponses?.pagination;
          const logs = response.errorLogListResponses?.errorLogs ?? [];

          this.errorLogs.set(logs);
          this.totalCount.set(pageData?.totalCount ?? logs.length);
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

    return `Failed to load error logs (HTTP ${error.status || 'unknown'}).`;
  }
}
